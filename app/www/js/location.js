const Geolocation = {};

function getGeolocationService(){
	//Gets the geolocation service which will either use BackgroundGeolocation (if available) or navigator.geolocation
	if (BackgroundGeolocation !== undefined) {
		//We have the ability to use background geolocation.
		Geolocation.watch = (timeDelay, callback) => {
			//Check we can actually use location.
			var permissions = cordova.plugins.permissions;
			var permsRequired = [permissions.ACCESS_FINE_LOCATION];
			permissions.requestPermissions(permsRequired, () => {
					//Setup the configuration.
				BackgroundGeolocation.configure({
					locationProvider: BackgroundGeolocation.DISTANCE_FILTER_PROVIDER,
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
			() => {});
		}
	}
	else if (window.navigator !== undefined){
		//use browser inbuilt navigator. Currently not implemented.
		console.error("Navigation using the browser 'navigation' object is not currently not supported!");
		Geolocation.watch = () => {};
		Geolocation.stop = () => {};
	}
	return Geolocation;
}