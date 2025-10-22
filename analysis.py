import os
import json

# @TODO - rewrite this entire thing in a typed language -- this is already spaghetti
# @TODO - dump everything into a sqlite db and make a fe web app to explore the data

gossip_out_directory = "/home/ubuntu/gossip-out"

# map of ips to node pubkeys seen at that ip
ips_map = {}
# map of node pubkeys to ips seen for that node
pubkeys_map = {}

# gossip files in the `gossip_out_directory` are output from `solana gossip`
# each file contains a list of nodes in JSON format like so:
#   {
#     "ipAddress": "98.84.108.51",
#     "identityPubkey": "Ht7CqsHtVWpmxvmrjqmxGGvyrzm3AmHejtbPg4JUa8V7",
#     "gossipPort": 9000,
#     "tpuPort": 9003,
#     "version": "2.3.11",
#     "featureSet": 2142755730,
#     "tpuQuicPort": 9009
#   },

# active_validators.json is output from `solana validators -um --output json`
active_validators = json.loads(open("active_validators.json").read())["validators"]

# store a list of staked validators
staked_validators = []
staked_validators_map = {}
for validator in active_validators:
    if validator["activatedStake"] > 0:
        staked_validators.append(validator["identityPubkey"])
        validator["activatedStakeUI"] = validator["activatedStake"] / 10 ** 9
        staked_validators_map[validator["identityPubkey"]] = validator

potential_sybil_ips = set()

record_index = 0
# we should be reading the records in order of time
records = os.listdir(gossip_out_directory)
records.sort()
for name in records:
    # Open file
    # print("checking record " + name)
    with open(os.path.join(gossip_out_directory, name)) as f:
        nodes = json.loads(f.read())
        for node in nodes:
            ip = node["ipAddress"]
            pubkey = node["identityPubkey"]
            if ip not in ips_map:
                ips_map[ip] = [{"pubkey": pubkey, "is_staked": pubkey in staked_validators, "timestamp": name}]
            elif ips_map[ip][-1]["pubkey"] != pubkey:
                # print("pubkey for ip " + ip + " changed from " + json.dumps(ips_map[ip][-1]) + " to " + pubkey)
                ips_map[ip].append({"pubkey": pubkey, "is_staked": pubkey in staked_validators, "timestamp": name})
                potential_sybil_ips.add(ip)
            # only checked staked validators
            if pubkey in staked_validators:
                # we want to check if there is some validator that shares a hotswap ip
                # this if statement will not trigger if there is a hotswap back and forth between just two validators
                if pubkey in pubkeys_map and ip != pubkeys_map[pubkey]:
                    print("staked validator " + pubkey + " found at new ip " + ip + " with previous ip " + pubkeys_map[pubkey])
                pubkeys_map[pubkey] = ip
    record_index += 1

output = []
for ip in potential_sybil_ips:
    # it's only a machine shared by sybils if there are multiple staked identities for that ip
    staked_pubkeys = set()
    for identity in ips_map[ip]:
        if identity["is_staked"]:
            staked_pubkeys.add(identity["pubkey"])
    if len(staked_pubkeys) > 1:
        staked_validators_for_this_ip = [staked_validators_map[pk] for pk in staked_pubkeys]
        output.append({ "ip" : ip, "identities": ips_map[ip], "staked_identities": list(staked_pubkeys), "validators_info": staked_validators_for_this_ip, "total_stakeUI": sum([staked_validators_map[pk]["activatedStakeUI"] for pk in staked_pubkeys]) })
of = open("sybil_analysis_output.json", "w+")
of.write(json.dumps(output, indent=4))
of.close()

print("analyzed " + str(record_index) + " gossip validator list records against a set of " + str(len(staked_validators)) + " staked validators")