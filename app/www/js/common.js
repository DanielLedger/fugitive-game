function displayAlert(container, context, text) {
	var alert = document.createElement("div");
	alert.classList.add("alert", "alert-" + context, "alert-dismissible");
	alert.id = "alert";
	alert.innerHTML = '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';
	alert.innerHTML = text + alert.innerHTML;
	container.appendChild(alert);
}