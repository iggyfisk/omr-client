import React from 'react';
import Participant from './participant';
import * as _ from 'lodash';
import * as Electron from 'electron';
import Config from '../config';

interface GameProperties {
    id : string;
}

class GameData {
    name : string;
    host : string;
    status : number;
    participants : string[] = [];

    constructor(public id : string){
    }
}

class GameOption{
    constructor(public id : string, public title : string, public callback : () => void){ }
}

export default class Game extends React.Component<GameProperties, GameData> {

    constructor(props){
        super(props);
        this.state = new GameData(this.props.id);
    }

    gameDataChanged(data){
        var state = this.state;

        var values = data.val();
        if (values){
            state.host = values.host;
            state.name = values.name;
            state.status = values.status;
            if (values.participants){
                state.participants = values.participants.map( participant => { return participant.participant; } );
            }
            else{
                state.participants = [];
            }
            this.setState(state);
        }
    }

    componentWillMount(){
        firebase.database().ref().child('/games/' + this.props.id ).on('value', this.gameDataChanged.bind(this));
    }

    componentWillUnmount(){
        firebase.database().ref().child('/games/' + this.props.id).off();
    }

    uploadTurn(path : string){
        alert("Uploading turn " + path);
    }

    start(){
        var cfg = new Config();

        Electron.remote.dialog.showOpenDialog({
            title: 'Please select a save file',
            defaultPath: cfg.getClientSettings().savesDir,
            filters: [ { name: 'Civ6 saves', extensions: ['Civ6Save'] } ],
            properties: ['openFile']
        }, (filePaths : string[]) => {
            if (filePaths && filePaths.length == 1) {
                this.uploadTurn(filePaths[0]);
            }
        });
    }

    delete(){
        // First remove all participants of this game
        var allParticipantsDeleted = Promise.all( this.state.participants.map( participant => { 
            return firebase.database().ref().child('/participants/' + participant).remove()
        }));

        // Then delete the game itself
        allParticipantsDeleted.then((success) => {
            firebase.database().ref().child('/games/' + this.props.id ).remove();
        });
    }

    join(){
        alert("Joining game");
    }

    leave(){
        alert("Leaving game");
    }

    getGameOptions(){
        var currentUserId = firebase.auth().currentUser.uid;
        var isHost = this.state.host == currentUserId;
        var isParticipant = this.state.participants.some( participant => participant == currentUserId );

        var options = [];

        if (isHost){
            options.push(new GameOption("btn-start", "Start game", this.start.bind(this)));
            options.push(new GameOption("btn-cancel", "Cancel game", this.delete.bind(this)));
        }
        else if (isParticipant){
            options.push(new GameOption("btn-leave", "Leave game", this.leave.bind(this)));
        }
        else{
            options.push(new GameOption("btn-join", "Join game", this.join.bind(this)));
        }

        return options;
    }

    render(){

        return (<div className="game">
            <div className="game-header">
                <div className="game-name">{ this.state.name }</div>
                <div className="game-participant-count">({ this.state.participants.length } players)</div>
                <div className="game-options">
                { 
                    this.getGameOptions().map( option => { 
                        return <button key={ option.id } className="game-option" onClick= { () => { option.callback() } }> { option.title } </button> 
                    } ) 
                }
                </div>
            </div>
            <div className="game-details">
                <div className="game-participant-list">
                    { this.state.participants.map( participantId => { return <Participant key={ participantId } id= { participantId }/> } ) }
                </div>
            </div>
        </div>);
    }
}