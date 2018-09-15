# ZOOTR Tracker

This is just another item and location tracker for OoT Randomizer. It supports tracking items, keys, and locations you've checked.

You can use the online version here:
https://jaredbranum.github.io/zootr-tracker/

It's written entirely in JavaScript (client-side), so you can run it locally offline as well. Just download the repo, and open `index.html` in your browser

## Features

* Available checks shown based on what you've collected
* Support for Accessible rules, No Major Glitches, and Logic-Only
* Configurable options for Rainbow Bridge, Open Door, Open Forest, and Fast Ganon
* Options to shuffle Weird Egg, Ocarinas, and Gerudo's Card
* A quick dialog box to assign medallions and stones to dungeons by reading the Pedestal of Time
* Checks displayed as a checklist (not a map view), but grouped by region

## Currently unsupported or unfinished

* Keysanity: Key tracking is available, but currently checks do not consider your keys
* Bombchus: Logic-Only will show you checks that you can do with chus even if you don't have a Bomb Bag. The easiest workaround for this is to only check the Bombchu icon after you've collected a Bomb Bag (or alternatively, uncheck it once you run out of chus)
* Tokensanity: Not yet implemented
* Gossip Stone hints: Not yet implemented
* Popout item view: Not yet implemented
* Saving and Loading: Not yet implemented

## Logic Bugs

I'm sure there will be some logic bugs with this, especially with the NMG and Logic-Only options. I built this for myself primarily to use when racing Accessible rules, so that's what I focused on. Feel free to let me know whenever you run across bugs and I'll try to fix them.

[@jaredbranum](https://twitter.com/jaredbranum) on Twitter  
maxx#9586 on Discord