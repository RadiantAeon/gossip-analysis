#!/bin/bash
/home/ubuntu/.local/share/solana/install/active_release/bin/solana gossip -um --output json > /home/ubuntu/gossip-out/$(date +"%Y-%m-%d_%H-%M-%S").txt
