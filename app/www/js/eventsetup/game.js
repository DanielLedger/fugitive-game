//There will be more stuff here once I bother moving it.
document.getElementById("tab1").onclick = () => {
    selectTab(
        document.getElementById("tab1"),
        document.getElementById("navheader"),
        document.getElementById("map"),
        document.getElementById("content")
    );
};

document.getElementById("tab2").onclick = () => {
    selectTab(
        document.getElementById("tab2"),
        document.getElementById("navheader"),
        document.getElementById("goals"),
        document.getElementById("content")
    );
};

document.getElementById("tab3").onclick = () => {
    selectTab(
        document.getElementById("tab3"),
        document.getElementById("navheader"),
        document.getElementById("players"),
        document.getElementById("content")
    );
};

document.getElementById("tab4").onclick = () => {
    selectTab(
        document.getElementById("tab4"),
        document.getElementById("navheader"),
        document.getElementById("abilities"),
        document.getElementById("content")
    );
};