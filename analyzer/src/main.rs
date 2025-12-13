use anyhow::{Context, Result};
use clap::Parser;
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use solana_cli_output::CliGossipNodes;
use std::collections::{HashMap, HashSet};
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};

/// CLI for analyzer
#[derive(Parser, Debug)]
#[command(version, about = "Sybil analyzer (Rust port of analysis.py)")]
struct Args {
    /// Directory with gossip JSON files (output of `solana gossip` recordings)
    #[arg(long, default_value = "/home/ubuntu/gossip-out")]
    gossip_dir: PathBuf,

    /// Path to `active_validators.json`
    #[arg(long, default_value = "active_validators.json")]
    active_validators: PathBuf,

    /// Path to `jito_validators.json`
    #[arg(long, default_value = "jito_validators.json")]
    jito_validators: PathBuf,

    /// Path to `sfdp_participants.json`
    #[arg(long, default_value = "sfdp_participants.json")]
    sfdp_participants: PathBuf,

    /// Output path (defaults to `sybil_analysis_output.json`)
    #[arg(long, default_value = "sybil_analysis_output.json")]
    output: PathBuf,

    /// Verbose logging
    #[arg(long, default_value_t = false)]
    verbose: bool,
}

#[derive(Debug, Deserialize)]
struct ActiveValidatorsFile {
    validators: Vec<ValidatorRaw>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
struct ValidatorRaw {
    #[serde(rename = "identityPubkey")]
    identity_pubkey: String,

    #[serde(rename = "voteAccountPubkey")]
    vote_account_pubkey: String,

    #[serde(rename = "activatedStake", default)]
    activated_stake: Option<u64>,

    // Other fields may exist; preserve the full object by capturing unknown fields
    #[serde(flatten)]
    extra: HashMap<String, Value>,
}

#[derive(Debug, Deserialize)]
struct JitoValidatorsFile {
    validators: Vec<JitoValidator>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct JitoValidator {
    vote_account: String,
    running_jito: bool,
    running_bam: bool,
    active_stake: u64,
    jito_sol_active_lamports: u64,
    mev_commission_bps: Option<u64>,
    priority_fee_commission_bps: u64,
}

#[derive(Debug, Deserialize)]
struct SfdpParticipant {
    #[serde(rename = "mainnetBetaPubkey")]
    mainnet_beta_pubkey: String,
    state: String,
}

#[derive(Debug, Serialize, Clone)]
struct ValidatorInfoOut {
    identity_pubkey: String,
    vote_account_pubkey: String,
    activated_stake: u64,
    activated_stake_ui: f64,

    // jito fields injected
    jito_stakepool: bool,
    jito_stake: u64,
    jito_stake_ui: f64,

    // sfdp fields injected
    sfdp_participant: bool,
    sfdp_status: Option<String>,

    ips: Vec<String>,
}

#[derive(Debug, Serialize, PartialEq, Eq, PartialOrd, Ord, Hash)]
struct VisNode {
    id: String,
    label: String,
    group: String,
    title: String,
    value: u64,
}

#[derive(Debug, Serialize, PartialEq, Eq, Hash)]
struct VisEdge {
    id: String,
    from: String,
    to: String,
    label: String,
    title: String,
}

#[derive(Debug, Serialize)]
struct VisNetworkOutput {
    nodes: Vec<VisNode>,
    edges: Vec<VisEdge>,
}

#[derive(Debug, Serialize)]
enum NodeGroup {
    SFDP,
    SFDPandJito,
    JITO,
    Regular,
}

fn read_json_file<T, P>(path: P) -> Result<T>
where
    T: DeserializeOwned,
    P: AsRef<Path>,
{
    let path_ref = path.as_ref();
    let text =
        fs::read_to_string(path_ref).with_context(|| format!("reading {}", path_ref.display()))?;
    let parsed =
        serde_json::from_str(&text).with_context(|| format!("parsing {}", path_ref.display()))?;
    Ok(parsed)
}

fn write_json_pretty<T, P>(path: P, value: &T) -> Result<()>
where
    T: Serialize,
    P: AsRef<Path>,
{
    let path_ref = path.as_ref();
    let mut file =
        File::create(path_ref).with_context(|| format!("creating {}", path_ref.display()))?;
    let pretty = serde_json::to_string_pretty(value).context("serializing output")?;
    file.write_all(pretty.as_bytes())
        .with_context(|| format!("writing {}", path_ref.display()))?;
    Ok(())
}

fn collect_gossip_files<P>(dir: P) -> Result<Vec<PathBuf>>
where
    P: AsRef<Path>,
{
    let dir_ref = dir.as_ref();
    let mut files = Vec::new();
    for entry in fs::read_dir(dir_ref).with_context(|| format!("reading {}", dir_ref.display()))? {
        let entry = entry?;
        let path = entry.path();
        if path.is_file() {
            files.push(path);
        }
    }
    files.sort();
    Ok(files)
}

fn lamports_to_sol(lamports: u64) -> f64 {
    (lamports as f64) / 1e9
}

fn read_gossip_file<P>(path: P) -> Result<(String, CliGossipNodes)>
where
    P: AsRef<Path>,
{
    let path_ref = path.as_ref();
    let text = fs::read_to_string(path_ref)
        .with_context(|| format!("reading gossip record file {}", path_ref.display()))?;
    let nodes =
        serde_json::from_str(&text).with_context(|| format!("parsing {}", path_ref.display()))?;
    let filename = path_ref
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("unknown")
        .to_string();
    Ok((filename, nodes))
}

fn build_staked_validators_map(
    active_validators: Vec<ValidatorRaw>,
    jito_by_vote: &HashMap<String, &JitoValidator>,
    sfdp_by_pubkey: &HashMap<String, &SfdpParticipant>,
) -> HashMap<String, ValidatorInfoOut> {
    let mut staked_validators = HashMap::new();

    for validator in active_validators {
        let Some(activated_lamports) = validator.activated_stake else {
            continue;
        };
        if activated_lamports == 0 {
            continue;
        }

        let activated_ui = lamports_to_sol(activated_lamports).floor();

        let (jito_stakepool, jito_stake_lamports) =
            match jito_by_vote.get(&validator.vote_account_pubkey) {
                Some(jito) => (true, jito.jito_sol_active_lamports),
                None => (false, 0),
            };
        let jito_stake_ui = lamports_to_sol(jito_stake_lamports).floor();

        let (sfdp_participant, sfdp_status) = sfdp_by_pubkey
            .get(&validator.identity_pubkey)
            .map_or((false, None), |entry| (true, Some(entry.state.clone())));

        staked_validators.insert(
            validator.identity_pubkey.clone(),
            ValidatorInfoOut {
                identity_pubkey: validator.identity_pubkey,
                vote_account_pubkey: validator.vote_account_pubkey,
                activated_stake: activated_lamports,
                activated_stake_ui: activated_ui,
                jito_stakepool,
                jito_stake: jito_stake_lamports,
                jito_stake_ui,
                sfdp_participant,
                sfdp_status,
                ips: Vec::new(),
            },
        );
    }

    staked_validators
}

fn analyze_gossip_files(
    files: &[PathBuf],
    staked_validators_map: &mut HashMap<String, ValidatorInfoOut>,
) -> Result<VisNetworkOutput> {
    // key is identity pubkey, value is list of IPs
    let mut ips_map: HashMap<String, Vec<String>> = HashMap::new();

    for path in files {
        let (_filename, nodes) = read_gossip_file(path)?;

        for node in nodes.0.iter() {
            let Some(ip) = node.ip_address.clone() else {
                continue;
            };
            let pubkey = node.identity_pubkey.clone();
            let is_staked = staked_validators_map.contains_key(&pubkey);

            if is_staked {
                let ips_for_pubkey = ips_map.entry(pubkey.clone()).or_default();
                if !ips_for_pubkey.contains(&ip) {
                    ips_for_pubkey.push(ip);
                }
            }
        }
    }

    // sort and dedup IPs so we can easily search in the next step
    ips_map.iter_mut().for_each(|(_, ips)| {
        ips.dedup();
        ips.sort();
    });

    // generate edges between nodes that share IPs
    let mut edges = HashSet::new();
    let mut unique_identities = HashSet::new();
    let mut already_checked_identities = Vec::new();
    for (identity, ips) in &ips_map {
        already_checked_identities.push(identity.clone());
        for (identity2, ips2) in &ips_map {
            if already_checked_identities.contains(identity2) {
                continue;
            }
            for ip in ips {
                if ips2.binary_search(ip).is_ok() {
                    let (from, to) = if identity < identity2 {
                        (identity.to_string(), identity2.to_string())
                    } else {
                        (identity2.to_string(), identity.to_string())
                    };
                    edges.insert(VisEdge {
                        id: format!("edge:{}::{}::{}", identity, identity2, ip),
                        from,
                        to,
                        label: ip.clone(),
                        title: format!("Shared IP: {}", ip),
                    });
                    unique_identities.insert(identity.clone());
                    unique_identities.insert(identity2.clone());
                }
            }
        }
    }

    // generate nodes based on unique identities found that have sybils
    let mut nodes = HashSet::new();
    for (identity_pubkey, staked_node) in staked_validators_map {
        if unique_identities.contains(identity_pubkey) {
            nodes.insert(VisNode {
                id: identity_pubkey.clone(),
                label: identity_pubkey.chars().take(8).collect(),
                group: format!("{:?}", if staked_node.sfdp_participant && staked_node.sfdp_status.as_ref().unwrap() == "Approved" {
                    if staked_node.jito_stakepool {
                        NodeGroup::SFDPandJito
                    } else {
                        NodeGroup::SFDP
                    }
                } else {
                    if staked_node.jito_stakepool {
                        NodeGroup::JITO
                    } else {
                        NodeGroup::Regular
                    }
                }),
                title: format!(
                    "Identity: {}\nVote: {}\nStake: {:.3} SOL\nJito pool: {}\nJito stake: {:.3} SOL\nSFDP: {}",
                    staked_node.identity_pubkey,
                    staked_node.vote_account_pubkey,
                    staked_node.activated_stake_ui,
                    if staked_node.jito_stakepool { "yes" } else { "no" },
                    staked_node.jito_stake_ui,
                    if staked_node.sfdp_participant {
                        staked_node.sfdp_status.clone().unwrap()
                    } else {
                        "Not participant".to_string()
                    },
                ),
                value: staked_node.activated_stake_ui.round() as u64,
            });
        }
    }

    return Ok(VisNetworkOutput {
        nodes: nodes.into_iter().collect(),
        edges: edges.into_iter().collect(),
    });
}

fn main() -> Result<()> {
    let args = Args::parse();

    if args.verbose {
        eprintln!("args: {:?}", args);
    }

    let active_validators: ActiveValidatorsFile = read_json_file(&args.active_validators)?;
    let jito_validators: JitoValidatorsFile = read_json_file(&args.jito_validators)?;
    let sfdp_participants: Vec<SfdpParticipant> = read_json_file(&args.sfdp_participants)?;

    let jito_by_vote: HashMap<String, &JitoValidator> = jito_validators
        .validators
        .iter()
        .map(|validator| (validator.vote_account.clone(), validator))
        .collect();

    let sfdp_by_pubkey: HashMap<String, &SfdpParticipant> = sfdp_participants
        .iter()
        .map(|participant| (participant.mainnet_beta_pubkey.clone(), participant))
        .collect();

    let mut staked_validators_map =
        build_staked_validators_map(active_validators.validators, &jito_by_vote, &sfdp_by_pubkey);

    let gossip_files = collect_gossip_files(&args.gossip_dir)?;
    let vis_output = analyze_gossip_files(&gossip_files, &mut staked_validators_map)?;

    write_json_pretty(&args.output, &vis_output)?;

    Ok(())
}
