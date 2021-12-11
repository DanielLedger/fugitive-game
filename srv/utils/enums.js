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

module.exports = {
    states: states,
    roles: roles,
	r_roles: r_roles
};