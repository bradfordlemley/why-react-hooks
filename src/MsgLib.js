import * as firebase from 'firebase/app'
import 'firebase/database';
import { createStatedLib } from '@stated-library/base';

try {
  firebase.initializeApp({
    apiKey: 'AIzaSyCXh3HpbB_jhMNuxc1vOsDkUUCIlRBNYm0',
    authDomain: 'geo-chat-7d7c6.firebaseapp.com',
    databaseURL: 'https://geo-chat-7d7c6.firebaseio.com',
    projectId: 'geo-chat-7d7c6',
    storageBucket: '',
    messagingSenderId: '453185349176',
  })
} catch (e) {}


const getLocationId = ({latitude, longitude}) =>
  `${(latitude * 10).toFixed()}_${(longitude * 10).toFixed()}`

const createMsgLib = () => createStatedLib(
  {
    username: window.localStorage.getItem('geo-chat:username'),
    messages: [],
  },
  base => {

    let navListenerId;
    let dbRef;

    function onDbValue(snapshot) {
      base.updateState({
        messages: Object.entries(snapshot.val() || {}).map(
          ([id, data]) => ({id, ...data}),
        ),
      });
    }

    function setCoords(coords) {
      base.updateState({
        coords,
        messages: [],
      });
      const locationId = getLocationId(coords);
      console.log('registering with locationid of ', locationId);
      dbRef && dbRef.off('value', onDbValue);
      dbRef = firebase
        .database()
        .ref(`messages/${locationId}/posts`);
      dbRef.on('value', onDbValue);
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        setCoords(position.coords);
      },
      error => {
        console.error(`cound not get position`);
      },
    )

    navListenerId = navigator.geolocation.watchPosition(
      position => {
        setCoords(position.coords);
      },
      error => {
        console.error(`cound not get position`);
      },
    );

    base.onUnsubscribe && base.onUnsubscribe(() => {
      navigator.geolocation.clearWatch(navListenerId);
      dbRef.off('value', onDbValue);
    })

    return {
      addMessage(msg) {
        dbRef
          .push({
            date: Date.now(),
            content: msg,
            username: base.state.username || 'anonymous',
            latitude: base.state.coords.latitude,
            longitude: base.state.coords.longitude,
          });
      },

      setUsername(username) {
        window.localStorage.setItem('geo-chat:username', username);
        base.updateState({username});
      },
    }
  }
);

export default createMsgLib;