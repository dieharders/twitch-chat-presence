# Twitch: Chat Presence
![Preview Chat](https://github.com/dieharders/twitch-chat-presence/blob/master/source/preview-1.jpg)

## Info
There is no back-end required; Twitch provides all the chat/user information via the module `tmi.min.js`. The app simply styles the chat rooms in a way that provides the owner of the room some specific feedback.
![Preview Chat](https://github.com/dieharders/twitch-chat-presence/blob/master/source/preview-2.png)

## How to use with OBS stream sources
1. Add a `Browser` source
- Go to its properties and point the url to: `https://twitch-chat-presence.firebaseapp.com`
2. Make the source background transparent
- Paste the following code into the `Custom CSS` field:
> #container {background-color: transparent;}
> #settings-icon {opacity: 0;}
- This will turn background elements transparent. Now it functions like an overlay.
3. Setup app from source window
- You may need to login/setup the website that is serving as your source. To do this, right click on the browser source and click `Interact`.
- A new window will popup that allows you to interact with the website. Do what you need then close this window.
- Move/resize the source window as needed.
4. Done! Now you should see a similiar result as below:
![Preview Chat](https://github.com/dieharders/twitch-chat-presence/blob/master/source/preview-avatars.png)

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