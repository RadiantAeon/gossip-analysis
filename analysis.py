import os
import json

gossip_out_directory = "/home/ubuntu/gossip-out"
node_ips = {}

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
for validator in active_validators:
    if validator["activatedStake"] > 0:
        staked_validators.append(validator["identityPubkey"])

for name in os.listdir(gossip_out_directory):
    # Open file
    with open(os.path.join(gossip_out_directory, name)) as f:
        nodes = json.loads(f.read())
        for node in nodes:
            ip = node["ipAddress"]
            pubkey = node["identityPubkey"]
            # we want to detect if a staked validator shares a hotswap ip
            # so if a validator that keeps changing their ip(maybe they have a dynamic ip), we ignore that
            if pubkey in staked_validators:
                if ip not in node_ips:
                    node_ips[ip] = [pubkey]
                elif node_ips[ip][-1] != pubkey:
                    print("pubkey for ip " + ip + " changed from " + node_ips[ip][-1] + " to " + pubkey)
                    node_ips[ip].append(pubkey)