package com.timhagn.rngloc;

import android.location.Location;
import android.support.annotation.Nullable;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

/**
 * Created by hagn on 11/5/15.
 *
 * Simple React Native Module for accessing Android Location Services by way of Google Play Services
 *
 */
public class RNGLocationModule extends ReactContextBaseJavaModule implements LocationProvider.LocationCallback {
    // React Class Name as called from JS
    public static final String REACT_CLASS = "RNGLocation";
    // Unique Name for Log TAG
    public static final String TAG = RNGLocationModule.class.getSimpleName();
    // Save last Location Provided
    private Location mLastLocation;
    // The Google Play Services Location Provider
    private LocationProvider mLocationProvider;
    //The React Native Context
    ReactApplicationContext mReactContext;


    // Constructor Method as called in Package
    public RNGLocationModule(ReactApplicationContext reactContext) {
        super(reactContext);
        // Save Context for later use
        mReactContext = reactContext;

        // Get Location Provider from Google Play Services
        mLocationProvider = new LocationProvider(mReactContext.getApplicationContext(), this);

        // Check if all went well and the Google Play Service are available...
        if (!mLocationProvider.checkPlayServices()) {
            Log.i(TAG, "Location Provider not available...");
        } else {
            // Connect to Play Services
            mLocationProvider.connect();
            Log.i(TAG, "Location Provider successfully created.");
        }
    }


    @Override
    public String getName() {
        return REACT_CLASS;
    }

    /*
     * Location Callback as defined by LocationProvider
     */
    @Override
    public void handleNewLocation(Location location) {
        if (location != null) {
            mLastLocation = location;
            Log.i(TAG, "New Location..." + location.toString());
            getLocation();
        }
    }

    /*
     * Location Provider as called by JS
     */
    @ReactMethod
    public void getLocation() {
        if (mLastLocation != null) {
            try {
                double Longitude;
                double Latitude;

                // Receive Longitude / Latitude from (updated) Last Location
                Longitude = mLastLocation.getLongitude();
                Latitude = mLastLocation.getLatitude();

                Log.i(TAG, "Got new location. Lng: " + Longitude+" Lat: " + Latitude);

                // Create Map with Parameters to send to JS
                WritableMap params = Arguments.createMap();
                params.putDouble("Longitude", Longitude);
                params.putDouble("Latitude", Latitude);

                // Send Event to JS to update Location
                sendEvent(mReactContext, "updateLocation", params);
            } catch (Exception e) {
                e.printStackTrace();
                Log.i(TAG, "Location services disconnected.");
            }
        }
    }

    /*
     * Internal function for communicating with JS
     */
    private void sendEvent(ReactContext reactContext, String eventName, @Nullable WritableMap params) {
        if (reactContext.hasActiveCatalystInstance()) {
            reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit(eventName, params);
        } else {
            Log.i(TAG, "Waiting for CatalystInstance...");
        }
    }

    @Override
    protected void finalize() throws Throwable {
        super.finalize();
        // If Location Provider is connected, disconnect.
        if (mLocationProvider != null && mLocationProvider.connected) {
            mLocationProvider.disconnect();
        }
    }
}
