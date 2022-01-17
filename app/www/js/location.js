const Geolocation = {};

function getGeolocationService(){
	//Gets the geolocation service which will either use BackgroundGeolocation (if available) or navigator.geolocation
	console.log("Getting geolocation service...")
	if (cordova.platformId !== 'browser') { //I'm very, very unlikely to support Electron.
		console.log("Getting Background Geolocation service.")
		//We have the ability to use background geolocation.
		Geolocation.watch = (timeDelay, callback) => {
			//Check we can actually use location.
			var permissions = cordova.plugins.permissions;
			var permsRequired = [permissions.ACCESS_FINE_LOCATION, permissions.ACCESS_COARSE_LOCATION, permissions.ACCESS_BACKGROUND_LOCATION];
			permissions.requestPermissions(permsRequired, () => {
					//Setup the configuration.
				BackgroundGeolocation.configure({
					locationProvider: BackgroundGeolocation.RAW_PROVIDER,
	    			desiredAccuracy: BackgroundGeolocation.HIGH_ACCURACY,
	    			stationaryRadius: 5,
	    			distanceFilter: 5,
	    			notificationTitle: 'Fugitive Game',
	    			notificationText: 'The game is running in the background. Check the map for updates.',
	    			startForeground: true,
					debug: true,
	    			interval: timeDelay,
	    			fastestInterval:timeDelay,
	    			activitiesInterval: timeDelay
				});
				
				//User permission stuff
				BackgroundGeolocation.on('authorization', function(status) {
	    			console.log('[INFO] BackgroundGeolocation authorization status: ' + status);
	    			if (status !== BackgroundGeolocation.AUTHORIZED) {
	     			// we need to set delay or otherwise alert may not be shown
						setTimeout(function() {
							var showSettings = confirm('App requires location tracking permission. Would you like to open app settings?');
							if (showSettings) {
								return BackgroundGeolocation.showAppSettings();
							}
	      				}, 1000);
	    			}
	  			});
				//Bind the given function to the location event.
				BackgroundGeolocation.on('location', (loc) => {
					//We're going to run it as a task to be on the safe side (not that I'm able to build for iOS).
					BackgroundGeolocation.startTask((tk) => {
						callback(loc);
						BackgroundGeolocation.endTask(tk);
					});
				});
				
				BackgroundGeolocation.start(); //Start watching.
			
				Geolocation.stop = () => {
					BackgroundGeolocation.stop();
				};
			},
			() => {
				console.error("Location permission grant failed.");
			});
		}
	}
	else if (window.navigator !== undefined){
		//Use browser inbuilt navigator.
		var nav = window.navigator.geolocation;
		Geolocation.watch = (delay, cb) => {
			Geolocation.watchTask = nav.watchPosition((ll) => {
				var expectedObj = {};
				expectedObj.latitude = ll.coords.latitude;
				expectedObj.longitude = ll.coords.longitude;
				expectedObj.accuracy = ll.coords.accuracy;
				cb(expectedObj);
			}, () => {}, {
				//Turns out delay isn't directly used, so we're using it like this.
				enableHighAccuracy: true,
				maximumAge: delay
			});
		};
		Geolocation.stop = () => {
			nav.clearWatch(Geolocation.watchTask);
		};
	}
	else {
		//No location source, die impressively.
		console.error("No functional location source detected! This won't work unless this device is spectating.");
		alert("Error! Your device does not support location, so this game will not work. If you're simply spectating, you can ignore this message."
		+ "Otherwise, make sure you have location (and the correct permissions) enabled.");
	}
	return Geolocation;
}