/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useEffect, useRef, useState } from 'react';
import {
    HornConnection,
    HornConfiguration,
    VideoService,
    PluginMessages,
    VideoConnectionReceiving,
    IUsersSparkLines,
} from '@horn/api';

type HornConfig = {
    token?: string;
    channelId?: string;
}

type HornStream = {
    startSession: () => Promise<void>;
    acceptInvite: () => Promise<void>;
    changeMicrophoneState: (isEnabled: boolean) => Promise<any>;
    receivingConnections: VideoConnectionReceiving[];
    microphoneEnabled: boolean;
    sparkLines: IUsersSparkLines | undefined,
    userId: number | null;
}

const useHorn = (config: HornConfig): HornStream => {
    const {
        token,
        channelId,
    } = config;


    const [receivingConnections, setReceivingConnections] = useState<VideoConnectionReceiving[]>([]);
    const [microphoneEnabled, setMicrophoneEnabled] = useState(false);
    const [sparkLineInterval, setSparkLineInterval] = useState<NodeJS.Timeout>();
    const [sparkLines, setSparkLines] = useState<IUsersSparkLines>();

    const connectionRef = useRef<HornConnection>(HornConnection.get());

    const connection = connectionRef.current;
    const api = connection.getAPI();

    const initializeChannelConnection = async (): Promise<void> => {
        if (!channelId || !token) return;
        // Set required configuration for API and Horn Connection
        HornConfiguration.configure({
            authToken: token
        });
        connection.configure(channelId);
    };

    const handleHornWebSocketEvents = async (message: PluginMessages.WebSocket.TWebSocketMessage) => {
        // Get Receiving Connections every time Active Video Senders change.
        // Currently not working as intended.
        if (message.type === 'external' && message.data.messageType === 'LiveVideoStreams') {
            console.log('### info', VideoService.get().getReceivingStreamsToPlay()) // Updates as expected
            console.log('### connection', VideoService.get().getReceivingConnections()); // Doesn't update when a user joins the conference room.
            // Needed to use React State because returning the Get method itself doesn't update/re-render.
            setReceivingConnections(VideoService.get().getReceivingConnections());
        }
    };

    const startConnection = async (): Promise<void> => {
        if (!channelId) return;

        await connection.start();
    };

    const acceptInvite = async (): Promise<void> => {
        // Go inside Channel/Conference Room
        api.acceptInvitation();
        // Begin sending/receiving audio
        connection.getAPI().startAudio(true);
        // Once we're in the channel, start sending camera stream after 2 seconds
        window.setTimeout(async () => {
            const firstCameraSource = VideoService.get().getAvailableVideoSources().find((s) => s.type === 'camera');
            if(firstCameraSource) {
                // Setup Video Stream to Horn
                console.log('Sharing camera...');
                await VideoService.get().startVideoSending(firstCameraSource);
                console.log('Camera has been shared!');

                // Setup Audio Stream to Horn
                const stream = await connection.audio().getMicBuilder().build();
                await connection.audio().useAsLocalStream(stream);

                // Request Voice Activity/Spark Lines per 1 second
                const interval = setInterval(async () => {
                    const userIds = VideoService.get().getSenders();
                    const sparkLines = await connection.getAPI().getSparkLines(userIds);
                    setSparkLines(sparkLines);
                }, 1000);

                setSparkLineInterval(interval);
            } else {
                console.warn('Couldn\'t find camera source to share.');
            }
        }, 2000);
    };

    const changeMicrophoneState = async (isEnabled: boolean): Promise<void> => {
        await connection.getAPI().setMicrophoneState(isEnabled);
    };

    connection.onVideoSendingStarted(() => {
        const mainConnection = VideoService.get().getSendingConnections()[0];
        try {
            mainConnection.getMainContainerId();
        } catch {
            // Show Video Stream in a specific element.
            mainConnection.setMainContainerId('mainUser');
        }
    });

    connection.onMicStateChanged((state) => {
        setMicrophoneEnabled(state);
    });

    connection.onWebSocketMessage(handleHornWebSocketEvents);

    useEffect(() => {
        initializeChannelConnection();
    }, [token, channelId]);

    useEffect(() => {
        // Stop Connection and SparkLine requests
        return (): void => {
            connection.stop();
            sparkLineInterval && clearInterval(sparkLineInterval);
        };
    }, [connection]);

    return {
        acceptInvite: acceptInvite,
        startSession: startConnection,
        changeMicrophoneState: changeMicrophoneState,
        receivingConnections: receivingConnections,
        sparkLines: sparkLines,
        microphoneEnabled,
        userId: connection.getCurrentUserId(),
    };
};

export default useHorn;