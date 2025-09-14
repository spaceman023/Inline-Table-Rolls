**Inline Table Rolls**
UPDATE 8/31/2023:
the new syntax uses double carats instead of double brackets to avoid triggering Foundry's builtin inline roll parsing!
You must update your syntax like so ^^#Table you want to roll^^


Rolling multiple results:
You can now specify how many times to roll on a particular table in your inline roll like so:

^^#?1d4?Monsters^^

^^#?5?Monsters^^

^^#?1d8?Uncommon Loot^^

However, you don't have to specify a number. If no number is specified, the module will assume that you want a single roll.

See the module in action on Youtube below:
[![Youtube Link](https://i.imgur.com/U7JyFDC.jpg)](https://youtu.be/_e60PpLr3QY)

This module for Foundry Virtual Tabletop allows users to roll on tables within a chat message. Once installed, a user can type the name of the table surrounded by brackets with a leading dash like so:

![Example Image 1](https://i.imgur.com/pDUiZyI.png)

Inline Table Rolls parses messages with the above formatting and outputs the following:

![Example Image 2](https://i.imgur.com/hg206r1.png)

Inline Table Rolls is especially convenient for creating complex encounter and loot instances like so:

![Example Image 3](https://i.imgur.com/5zp2jgq.png)

Inline Table Rolls even rolls recursively through tables within tables and has a built-in recursion limit to prevent infinite loops.

This is my first module, so I apologize for any bugs and I am open to any constructive criticism that will help me improve my project!
