use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use solana_cli_output::CliGossipNodes;
use std::collections::{HashMap, HashSet};
use std::fs::{self, File};
use std::io::Write;
use std::path::PathBuf;
use clap::Parser;


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
struct JitoValidator {
    vote_account: String,
    running_jito: bool,
    running_bam: bool,
    active_stake: u64,
    jito_sol_active_lamports: u64,
    mev_commission_bps: u64,
    priority_fee_commission_bps: u64,
}

#[derive(Debug, Deserialize)]
struct SfdpParticipant {
    #[serde(rename = "mainnetBetaPubkey")]
    mainnet_beta_pubkey: String,

    // `state` in the SFDP file is used in the Python script
    state: String,
}

#[derive(Debug, Serialize, Clone)]
struct IdentityRecord {
    pubkey: String,
    is_staked: bool,
    timestamp: String,
}

#[derive(Debug, Serialize, Clone)]
struct ValidatorInfoOut {
    identity_pubkey: String,
    vote_account_pubkey: String,
    activated_stake: Option<u64>,
    activated_stake_ui: Option<f64>,

    // jito fields injected
    jito_stakepool: bool,
    jito_stake: u64,
    jito_stake_ui: f64,

    // sfdp fields injected
    sfdp_participant: bool,
    sfdp_status: Option<String>,
}

#[derive(Debug, Serialize)]
struct SybilOutputItem {
    ip: String,
    identities: Vec<IdentityRecord>,
    staked_identities: Vec<String>,
    validators_info: Vec<ValidatorInfoOut>,
    total_stake_ui: f64,
}

fn main() -> Result<()> {
    let args = Args::parse();

    if args.verbose {
        eprintln!("args: {:?}", args);
    }

    // Load active_validators.json
    let active_validators_json = fs::read_to_string(&args.active_validators)
        .with_context(|| format!("reading {}", args.active_validators.display()))?;
    let active_validators: ActiveValidatorsFile =
        serde_json::from_str(&active_validators_json)
            .context("parsing active_validators.json")?;

    // Load jito_validators.json
    let jito_json = fs::read_to_string(&args.jito_validators)
        .with_context(|| format!("reading {}", args.jito_validators.display()))?;
    let jito_validators: JitoValidatorsFile =
        serde_json::from_str(&jito_json).context("parsing jito_validators.json")?;

    // Load sfdp_participants.json (array)
    let sfdp_json = fs::read_to_string(&args.sfdp_participants)
        .with_context(|| format!("reading {}", args.sfdp_participants.display()))?;
    let sfdp_participants: Vec<SfdpParticipant> =
        serde_json::from_str(&sfdp_json).context("parsing sfdp_participants.json")?;

    // Build maps for jito and sfdp lookups
    let jito_by_vote: HashMap<String, &JitoValidator> = jito_validators
        .validators
        .iter()
        .map(|j| (j.vote_account.clone(), j))
        .collect();

    let sfdp_by_pubkey: HashMap<String, &SfdpParticipant> = sfdp_participants
        .iter()
        .map(|s| (s.mainnet_beta_pubkey.clone(), s))
        .collect();

    // Build staked_validators and a map by identity pubkey
    let mut staked_validators: Vec<ValidatorInfoOut> = Vec::new();
    let mut staked_validators_map: HashMap<String, ValidatorInfoOut> = HashMap::new();

    for v in active_validators.validators.into_iter() {
        // consider staked if activatedStake > 0
        if let Some(act) = v.activated_stake {
            if act > 0 {
                let activated_ui = (act as f64) / 1e9;

                // Default jito fields
                let mut jito_pool = false;
                let mut jito_stake: u64 = 0;
                let mut jito_stake_ui: f64 = 0.0;

                if let Some(jv) = jito_by_vote.get(&v.vote_account_pubkey) {
                    jito_pool = true;
                    jito_stake_ui = (jv.jito_sol_active_lamports as f64) / 1e9;
                }

                // SFDP
                let mut sfdp_participant = false;
                let mut sfdp_status: Option<String> = None;
                if let Some(sp) = sfdp_by_pubkey.get(&v.identity_pubkey) {
                    sfdp_participant = true;
                    sfdp_status = Some(sp.state.clone());
                }

                let info = ValidatorInfoOut {
                    identity_pubkey: v.identity_pubkey.clone(),
                    vote_account_pubkey: v.vote_account_pubkey.clone(),
                    activated_stake: v.activated_stake,
                    activated_stake_ui: Some(activated_ui),
                    jito_stakepool: jito_pool,
                    jito_stake,
                    jito_stake_ui: jito_stake_ui,
                    sfdp_participant,
                    sfdp_status,
                };

                staked_validators_map.insert(v.identity_pubkey.clone(), info.clone());
                staked_validators.push(info);
            }
        }
    }

    // Prepare maps used while scanning gossip outputs
    let mut ips_map: HashMap<String, Vec<IdentityRecord>> = HashMap::new();
    let mut pubkeys_map: HashMap<String, String> = HashMap::new();
    let mut potential_sybil_ips: HashSet<String> = HashSet::new();

    // Read gossip records directory, iterate sorted file names
    let mut filenames: Vec<PathBuf> = Vec::new();
    for entry in fs::read_dir(&args.gossip_dir).with_context(|| format!("reading {}", args.gossip_dir.display()))? {
        let e = entry?;
        let path = e.path();
        if path.is_file() {
            filenames.push(path);
        }
    }
    filenames.sort();

    let mut record_index = 0usize;

    for path in filenames {
        let fname = path
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("unknown")
            .to_string();

        let text = fs::read_to_string(&path)
            .with_context(|| format!("reading gossip record file {}", path.display()))?;
        let nodes: CliGossipNodes =
            serde_json::from_str(&text).with_context(|| format!("parsing {}", path.display()))?;

        for node in nodes.0.iter() {
            // node expected to contain "ipAddress" and "identityPubkey"
            let ip = node.ip_address.clone().unwrap();
            let pubkey = node.identity_pubkey.clone();

            let is_staked = staked_validators_map.contains_key(&pubkey);

            let entry = IdentityRecord {
                pubkey: pubkey.clone(),
                is_staked,
                timestamp: fname.clone(),
            };

            let list = ips_map.entry(ip.clone()).or_default();
            let needs_append = list.last().map_or(true, |last| last.pubkey != pubkey);

            if needs_append {
                list.push(entry);
                // if ip changed pubkey, mark potential sybil ip
                if list.len() > 1 {
                    // the Python logic marks change when a new pubkey appended; it adds ip to potential
                    potential_sybil_ips.insert(ip.clone());
                }
            }

            // track staked pubkeys seen at ip; also warn if staked validator found on new ip
            if is_staked {
                if let Some(prev_ip) = pubkeys_map.get(&pubkey) {
                    if prev_ip != &ip {
                        println!(
                            "staked validator {} found at new ip {} with previous ip {}",
                            pubkey, ip, prev_ip
                        );
                    }
                }
                pubkeys_map.insert(pubkey.clone(), ip.clone());
            }
        }

        record_index += 1;
    }

    // Build output for potential sybil ips that actually host multiple staked validators
    let mut output: Vec<SybilOutputItem> = Vec::new();

    for ip in potential_sybil_ips.into_iter() {
        let identities = ips_map.get(&ip);
        if identities.is_none() {
            continue;
        }
        let identities = identities.unwrap();

        let mut staked_pubkeys: HashSet<String> = HashSet::new();
        for identity in identities.iter() {
            if identity.is_staked {
                staked_pubkeys.insert(identity.pubkey.clone());
            }
        }

        if staked_pubkeys.len() > 1 {
            let mut validators_info: Vec<ValidatorInfoOut> = Vec::new();
            let mut total_stake_ui: f64 = 0.0;

            for pk in staked_pubkeys.iter() {
                if let Some(vinfo) = staked_validators_map.get(pk) {
                    validators_info.push(vinfo.clone());
                    if let Some(ui) = vinfo.activated_stake_ui {
                        total_stake_ui += ui;
                    }
                }
            }

            let staked_identities: Vec<String> = staked_pubkeys.into_iter().collect();

            let out_item = SybilOutputItem {
                ip: ip.clone(),
                identities: identities.clone(),
                staked_identities,
                validators_info,
                total_stake_ui: total_stake_ui,
            };

            output.push(out_item);
        }
    }

    // Write sybil_analysis_output.json
    let mut of = File::create("sybil_analysis_output.json")
        .context("creating sybil_analysis_output.json")?;
    let pretty = serde_json::to_string_pretty(&output).context("serializing output")?;
    of.write_all(pretty.as_bytes())
        .context("writing sybil_analysis_output.json")?;

    println!(
        "analyzed {} gossip validator list records against a set of {} staked validators",
        record_index,
        staked_validators_map.len()
    );

    Ok(())
}