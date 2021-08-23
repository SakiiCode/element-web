/*
Copyright 2016 OpenMarket Ltd
Copyright 2019 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import React from 'react';
import { MatrixEvent } from 'matrix-js-sdk/src';

import BaseCard from "../views/right_panel/BaseCard";
import { RightPanelPhases } from "../../stores/RightPanelStorePhases";
import { replaceableComponent } from "../../utils/replaceableComponent";
import { MatrixClientPeg } from '../../MatrixClientPeg';

import ResizeNotifier from '../../utils/ResizeNotifier';
import EventTile, { TileShape } from '../views/rooms/EventTile';
import MessageComposer from '../views/rooms/MessageComposer';
import { RoomPermalinkCreator } from '../../utils/permalinks/Permalinks';
import { Layout } from '../../settings/Layout';
import TimelinePanel from './TimelinePanel';
import { Thread } from '../../../../matrix-js-sdk/src/models/thread';
import dis from "../../dispatcher/dispatcher";
import { ActionPayload } from '../../dispatcher/payloads';

interface IProps {
    roomId: string;
    onClose: () => void;
    resizeNotifier: ResizeNotifier;
    mxEvent: MatrixEvent;
    permalinkCreator?: RoomPermalinkCreator;
}

interface IState {
    replyToEvent?: MatrixEvent;
    thread?: Thread;
}

/*
 * Component which shows the filtered file using a TimelinePanel
 */
@replaceableComponent("structures.ThreadView")
class ThreadView extends React.Component<IProps, IState> {
    private dispatcherRef: string;

    constructor(props: IProps) {
        super(props);
        this.state = {};
    }

    public componentDidMount(): void {
        this.setupThread(this.props.mxEvent);
        this.dispatcherRef = dis.register(this.onAction);
    }

    public componentWillUnmount(): void {
        this.teardownThread();
        dis.unregister(this.dispatcherRef);
    }

    public componentDidUpdate(prevProps) {
        if (prevProps.mxEvent !== this.props.mxEvent) {
            this.teardownThread();
            this.setupThread(this.props.mxEvent);
        }
    }

    private onAction = (payload: ActionPayload): void => {
        if (payload.phase == RightPanelPhases.ThreadView && payload.event) {
            if (payload.event !== this.props.mxEvent) {
                this.teardownThread();
                this.setupThread(payload.event);
            }
        }
    };

    setupThread = (mxEv: MatrixEvent) => {
        const thread = mxEv.getThread();
        if (thread) {
            thread.on("Thread.update", this.updateThread);
            thread.once("Thread.ready", this.updateThread);
            this.updateThread(thread);
        }
    };

    teardownThread = () => {
        if (this.state.thread) {
            this.state.thread.removeListener("Thread.update", this.updateThread);
            this.state.thread.removeListener("Thread.ready", this.updateThread);
        }
    };

    updateThread = (thread?: Thread) => {
        if (thread) {
            this.setState({ thread });
        } else {
            this.forceUpdate();
        }
    };

    public renderEventTile(event: MatrixEvent): JSX.Element {
        return <EventTile
            key={event.getId()}
            mxEvent={event}
            enableFlair={false}
            showReadReceipts={false}
            tileShape={TileShape.FileGrid}
            as="div"
        />;
    }

    public render() {
        const room = MatrixClientPeg.get().getRoom(this.props.roomId);
        return (
            <BaseCard
                className="mx_ThreadView"
                onClose={this.props.onClose}
                previousPhase={RightPanelPhases.RoomSummary}
                withoutScrollContainer={true}
            >
                { this.state.thread && (
                    <TimelinePanel
                        manageReadReceipts={false}
                        manageReadMarkers={false}
                        timelineSet={this.state?.thread?.timelineSet}
                        showUrlPreview={false}
                        tileShape={TileShape.Notif}
                        empty={<div>empty</div>}
                        alwaysShowTimestamps={true}
                        layout={Layout.Group}
                        hideThreadedMessages={false}
                    />
                ) }
                <MessageComposer
                    room={room}
                    resizeNotifier={this.props.resizeNotifier}
                    replyToEvent={this.state?.thread?.replyToEvent}
                    showReplyPreview={false}
                    permalinkCreator={this.props.permalinkCreator}
                    compact={true}
                />
            </BaseCard>
        );
    }
}

export default ThreadView;
