
const express = require('express')
const app = express()
const { Expo } = require('expo-server-sdk');
const https = require('https');
const axios = require('axios');

 
let expo = new Expo();

var tokens = ['ExponentPushToken[oNBjXkAhNX3AEzFMst6Pxz]'];
var messages = [];
var userNotificationMap = new Map();
var URL_API_GET_LIEU = 'http://3.87.54.32/get/lieu/';
const DELAY_MINUTE = 10;


const callApi = () => {
  return new Promise((resolve, reject) => {
    console.log('api start');
    console.log(userNotificationMap.size);

    userNotificationMap.forEach((current_notification, current_token) => {
      console.log('ici', current_token); 
      let currenttime = new Date();
      console.log(currenttime);
      if(currenttime.getHours() >= current_notification.hoursStart && currenttime.getHours() < current_notification.hoursEnd){
        console.log('start', currenttime.getHours(), current_notification.hoursStart);
        console.log('end', currenttime.getHours(), current_notification.hoursEnd)

        if(current_notification.nbIteration == 0){
          userNotificationMap.delete(current_token);
        } else{
          console.log('test: ', current_notification);
          axios.get(URL_API_GET_LIEU + current_notification.idLocation).then(response => {

          console.log('json recuperé');

            let locationdata = response.data.data;
            console.log('number user', locationdata.number_user);
            let pourcentage_presence = locationdata.number_user > 0 ? (locationdata.number_user / locationdata.number_places) * 100 : 0;
            
            console.log('bofore test', pourcentage_presence , current_notification.fluxMin)
            console.log(pourcentage_presence, pourcentage_presence < current_notification.fluxMax , 
              pourcentage_presence >= current_notification.fluxMin );

            if(pourcentage_presence <= current_notification.fluxMax && pourcentage_presence >= current_notification.fluxMin){
              console.log('ca passe');  
  
                  if (!Expo.isExpoPushToken(current_token)) {
                    console.error(`Push token ${current_token} is not a valid Expo push token`);
                  }

                  let text = 'Le lieu ' + locationdata.name + ' a ' + pourcentage_presence + '% de fréquentation avec ' + locationdata.number_user + ' personnes présentes sur ' + locationdata.number_places;
                
                  messages.push({
                    to: current_token,
                    sound: 'default',
                    body: text,
                    data: { withSome: 'data' },
                  });

                  if (messages != null){
                    console.log("On envoie le message suivant: "  + messages);
                    let chunks = expo.chunkPushNotifications(messages);
                    let tickets = [];
                    let chunksWantSend = [ chunks[0][chunks[0].length - 1] ];
                    expo.sendPushNotificationsAsync(chunksWantSend).then(function(ticketResolved){
                      tickets.push(...ticketResolved);
                      console.log("resolution terminé" + ticketResolved);
                      resolve('successfull insert');
                    });
                  }else{
                    reject("error d'insertion..");
                  }   
            }
          });
        }
        current_notification.nbIteration--;
      }
      
    });
    resolve('nothing called')
  });
}


app.get('/add/token/:token/:idlocation/:hoursstart/:hoursend/:fluxmin/:fluxmax', function (req, res) {
  let notication =  {
    idLocation: req.params.idlocation,
    hoursStart : req.params.hoursstart,
    hoursEnd : req.params.hoursend,
    fluxMin : req.params.fluxmin,
    fluxMax : req.params.fluxmax,
    nbIteration : (req.params.hoursend - req.params.hoursstart) * 60 / 10 
  };

  userNotificationMap.set(req.params.token, notication);

  res.send('Done');
})

const mainAction = () => {
  callApi().then(function(result){
      console.log(result);
      setTimeout(function(){
          mainAction();
      }, DELAY_MINUTE * (60 * 1000));
  });
}

mainAction();

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})