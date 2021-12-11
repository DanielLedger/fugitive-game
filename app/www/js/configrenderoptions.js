var CONFIG_OPTIONS = {
    _goptions: {
        disabled: true //Default, since this key needs to exist.
    },
    timings_goptions: {
        min: 0,
        max: 1200,
        step: 1,
        displayName: "Timings"
    },
    timings_timer_options: {
        displayName: "Game Time",
        max: 86400,
        step: 60
    },
    timings_hstimer_options: {
        displayName: "Fugitive headstart",
        step: 10
    },
    timings_hunterLocDelay_options: {
        displayName: "Hunter Location delay"
    },
    timings_fugitiveLocDelay_options: {
        displayName: "Fugitive Location delay"
    },
    rolecounts_goptions: {
        min: 0,
        step: 1,
        displayName: "Role limits"
    },
    rolecounts_fugitivelimit_options: {
        displayName: "Limit fugitives?"
    },
    rolecounts_hunterlimit_options: {
        displayName: "Limit hunters?"
    },
    rolecounts_fugitive_options: {
        displayName: "Max fugitives"
    },
    rolecounts_hunter_options: {
        displayName: "Max hunters"
    }
};