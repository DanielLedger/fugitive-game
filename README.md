# fugitive-game
This is a game I've been working on (this being the 6th version).

The premise is very simple: it's like manhunt, except with a companion app. The game goes like this:

## Play instructions

0) Someone sets up a game server for the game (explained later) and everyone installs the app (also explained later). Each player should also have a reasonable amount of mobile data available.
1) You agree on a location to play and travel to a central-ish place there. Bonus points if the location has free WiFi.
2) Choose a player to be the host: they press 'generate code' and also type in the URL of the game server (https required due to android app restrictions and also because it's sending a live location feed over the open internet).
The host then (once everyone has the code) press 'start game'. Everyone else should ensure they also have the code and URL.
3) Everyone else presses 'join game'.
4) Once you've joined the game, you may select a role. The options are explained below.
5) The host can also adjust some game settings (more will be added in future) by editing them in the boxes. Nobody else is able to edit them.
6) Once everyone is in, the host presses "lock game and allocate roles". Then, everyone can see what role they are actually playing as.
7) Once everyone is ready and all settings are agreed upon, the host presses "start game" to start the game.
8) The game then proceeds roughly as below. If a fugitive is caught, they must press the large red button on their app screen.
9) The game is over once the timer expires, or all of one role are eliminated.

## Setup instructions.

### Server

1) Clone the repository into a chosen directory. If you are not installing the app from this computer you can delete the `app` directory.
2) Run the docker container, either using your docker GUI of choice or using `sudo ./run.sh` to execute the first run script. Note that if you do not use the
script, you'll need to generate your own keys for the `certs` directory (the openssl command is in the script).

### App

1) Clone the repository into a chosen directory. If you are not running the server from this computer you can delete the `srv` directory.
2) In the `app` directory, run `npm install cordova && npm install` to install cordova (which is needed to build the app) and all listed dependancies. Note that npm will complain about security issues, however there's not much you can do (`npm audit fix --force` just installs v10, which has issues that are 'fixed' by installing v9, which tries to 'fix' it by installing v10 and so on).
3) Make sure you have an accessible version of the android SDK. This is quite involved and beyond the scope of this quickly typed miniguide, see https://cordova.apache.org/docs/en/10.x/guide/platforms/android/
for more detail.
4) Run `cordova platform add android`.
5) Connect your phone via a USB cable to your PC. Make sure to allow the PC to do USB debugging.
6) Run `cordova run android` to install the app on the connected phone.

Note: It will be significantly easier if one person runs those steps and does 4 and 5 for all players.

Note 2: If someone has a mac, people with iPhones can also play by following this guide for building for iOS: https://cordova.apache.org/docs/en/10.x/guide/platforms/ios/index.html

Note 3: If people do not wish to (or are incapable of) installing the app, they can still watch on the PC used to build the app: `cordova platform add browser && cordova run browser` will open up
the app in a browser of choice, which can then join as a spectator.

## Roles

### Fugitive
The person or people who must run away, they're outnumbered, however get a live location feed. If they manage to run or hide until the timer expires, they win.

### Hunter
The people chasing the fugitives, they must catch them all before the timer expires.

### Either
Doesn't mind whether they are a fugitive or hunter, they will be allocated randomly when the game is locked.

### Spectator
This person is simply watching the action unfold: don't underestimate how tense and fun this can be!

