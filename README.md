# Twitch: Chat Presence
![Preview Chat](https://github.com/dieharders/twitch-chat-presence/blob/master/assets/preview-1.jpg)
![Preview Chat](https://github.com/dieharders/twitch-chat-presence/blob/master/assets/preview-2.png)

## Info
There is no back-end required; Twitch provides all the chat/user information via the module `tmi.min.js`. The app simply styles the chat rooms in a way that provides the owner of the room some specific feedback.

## Deploy Locally
Just click on `index.html` to start.

## Deploy Live
This app is entirely a front-end so you can deploy to any static web hosting server.

## Live demo: https://twitch-chat-presence.firebaseapp.com/
This browser app color codes chat messages to let you know who is present or has left the channel. It will also draw moderator/staff/sub/etc badges next to names and fade out messages by age. Overall this app aims to help make sense of the chat in regards to being engaging with your audience which can be tough to keep track of while playing games.

## Colors
- White = Unchanged status of chatter.
- Green = Chatter just joined the channel.
- Red   = Chatter just left the channel.