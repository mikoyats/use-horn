import React, { useEffect, useState } from 'react';
import './App.css';

import { AuthenticationService, ChannelsService } from '@horn/api';

import useHorn from './hooks/useHorn';

type ProviderCredentials = {
  token: string;
  channelId: string;
}

const {
  REACT_APP_CHANNEL_ID: CHANNEL_ID,
} = process.env as Record<string, string>;

const App: React.FC = () => {

  const [providerCredentials, setProviderCredentials] = useState<ProviderCredentials>();
  const [loading, setLoading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [inviteAccepted, setInviteAccepted] = useState(false);
  const {
      startSession,
      acceptInvite,
      changeMicrophoneState,
      receivingConnections,
      microphoneEnabled,
      sparkLines,
      userId,
  } = useHorn({
      token: providerCredentials?.token,
      channelId: providerCredentials?.channelId,
  });

  const mainSpark = Object.keys(sparkLines?.sparks || {}).find((spark) => spark === userId?.toString());

  const fetchProviderCredentials = async (): Promise<void> => {
      const clientId = (await ChannelsService.getClientId(CHANNEL_ID)).id
      // Create a new guest user to connect to our channel
      const guestName = `Guest_${Math.floor(Math.random() * 100) + 1}`
      const guest = await AuthenticationService.createGuestUser(
          clientId,
          CHANNEL_ID,
          guestName
      )
      setProviderCredentials({
          token: guest.token,
          channelId: CHANNEL_ID,
      });
  };

  const initializeStreams = async (): Promise<void> => {
      setLoading(true);
      await startSession();
      setSessionStarted(true);
      setLoading(false);
  };

  const getIn = async (): Promise<void> => {
      setLoading(true);
      acceptInvite();
      setInviteAccepted(true);
      setLoading(false);
  };

  const renderRemoteStreams = () => {
      return receivingConnections.map((connection) => {
          const sender = connection.getSenderData();
          const spark = Object.keys(sparkLines?.sparks || {}).find((spark) => Number(spark) === sender.id);

          return (
              <div key={sender.id}>
                  <h2>{sender.handle}</h2>
                  <video id={`u${sender.id}`}/>
                  {sparkLines && spark && <pre>{JSON.stringify(sparkLines.sparks[Number(spark)])}</pre>}
              </div>
          );
      });
  };

  useEffect(() => {
      for (const receivingConnection of receivingConnections) {
          const sender = receivingConnection.getSenderData();
          try {
              receivingConnection.getMainContainerId();
          } catch {
              // Show Video Stream in a previously rendered element in renderRemoteStreams
              receivingConnection.setMainContainerId(`u${sender.id}`);
              receivingConnection.setActive(true);
          }
      }
  }, [receivingConnections]);

  useEffect(() => {
      fetchProviderCredentials();
  }, []);

  return (
          <div>
              <pre>Credentials: {JSON.stringify(providerCredentials)}</pre>
              <button disabled={!providerCredentials || sessionStarted || loading} onClick={initializeStreams}>Start Session</button>
              {sessionStarted && (
                  <>
                      <h1>Lobby State: {!inviteAccepted ? 'Yes' : 'No'}</h1>
                      <button onClick={getIn} disabled={inviteAccepted || loading}>Get In</button>
                  </>
              )}
              <div>
                  <h1>Main User Stream</h1>
                  <video id="mainUser" />
                  {sparkLines && mainSpark && <pre>{JSON.stringify(sparkLines.sparks[Number(mainSpark)])}</pre>}
              </div>
              {inviteAccepted && (
                  <button onClick={(): Promise<void> => changeMicrophoneState(!microphoneEnabled)}>
                      {microphoneEnabled ? 'Mute' : 'Unmute'}
                  </button>
              )}
              <div>
                  <h1>Other User Streams</h1>
                  {renderRemoteStreams()}
              </div>
          </div>
  );
};

export default App;
