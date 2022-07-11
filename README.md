# Horn Prototype

This tests the `@horn/api` library and its functionality for making Custom UI.
The prototype includes the following features:

- Joining a Channel as a Guest User
- Video and Audio streams of all users in the channel
- Spark Lines (Voice Activity)
- Mute/Unmute

## Known Issues

- Streams of other users are only shown/received if you join the channel with them already there. When they join/rejoin, the user will not be shown.

## How to Use

1. Rename `.env.local` to `.env`
2. Put in the desired channel to join in `REACT_APP_CHANNEL_ID`
3. Run `npm start`
