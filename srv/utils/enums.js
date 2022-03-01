const states = {
	LOBBY: 'Lobby', //Not started the game yet.
	PLAYING: 'Playing', //In-game.
	POST: 'Post-game' //After the game, so we can show people a map with live locations on it.
}

const roles = {
	FUGITIVE: 'fugitive',
	HUNTER: 'hunter',
	SPECTATOR: 'spectator',
	POSTGAME: 'postgame'
}

const r_roles = {
	'fugitive': roles.FUGITIVE,
	'hunter': roles.HUNTER,
	'spectator': roles.SPECTATOR,
	'postgame': roles.POSTGAME
}

const out_reasons = {
	CAUGHT: "Got caught!",
	BORDER: "Went outside playable area!",
	TIME: "Out of time!",
	NO_LEFT: "All fugitives escaped, or out.",
	ESCAPE: "Escaped."
}

module.exports = {
    states: states,
    roles: roles,
	r_roles: r_roles,
	out_reasons: out_reasons
};