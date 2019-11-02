/* eslint-disable no-console */

//** Forked from: https://gist.github.com/AlcaDesign/742d8cb82e3e93ad4205 **//

// TODO: Fix adding duplicate `justinfan123` chatters
// TODO: Show transparent icon indicator for settings menu
// TODO: Put recently joined/left user names at top of list
// TODO: Add timeout to recently joined name color. Remove recently left user names on timeout.
// TODO: Ability to change up/down sorting of messages
// TODO: Make view resize for mobile screen
// TODO: Add buttons to menus for stretching/shrinking size
// TODO: Add sprite animations to avatars
// TODO: Port to new `Twitch API`

/////////////////
// Main Loop ////
/////////////////
//
window.onresize = handleWindowResizeEvent;

/////////////////
// Vars /////////
/////////////////
//

// Audio //
let audioMute       = false;
const SoundJoin     = new Audio('assets/join.mp3');
SoundJoin.volume    = 0.5;
const SoundLeave    = new Audio('assets/leave.mp3');
SoundLeave.volume   = 0.7;
const SoundMessage  = new Audio('assets/message.mp3');
SoundMessage.volume = 0.025;

// Sprites //
const avatarSprites = 	[
						'url(assets/avatar_01_mario_right.png)',
						'url(assets/avatar_02_princess_right.png)',
						'url(assets/avatar_03_bowser_right.png)',
						'url(assets/avatar_04_koopa_right.png)',
						'url(assets/avatar_05_kong_right.png)',
						'url(assets/avatar_06_yoshi_right.png)',
						'url(assets/avatar_07_toad_right.png)'
						];
// Chat Vars //
var channels = [], 		 // Channels to initially join
	fadeDelay = 10000,   // Set to false to disable chat fade
	showChannel = true,  // Show respective channels if the channels is longer than 1
	useColor = true,     // Use chatters' colors or to inherit
	showBadges = true,   // Show chatters' badges
	showEmotes = true,   // Show emotes in the chat
	doTimeouts = true,   // Hide the messages of people who are timed-out
	doChatClears = true, // Hide the chat from an entire channel
	showHosting = true,  // Show when the channel is hosting or not
	showConnectionNotices = true; // Show messages like "Connected" and "Disconnected"

let joinAnnounced;
var recentTimeouts = {};
var chatters = [];
var htmlChatters = [];
var chat = document.getElementById('debug-list');
var	defaultColors = [
					'rgb(255, 0, 0)',
					'rgb(0, 0, 255)',
					'rgb(0, 128, 0)',
					'rgb(178, 34, 34)',
					'rgb(255, 127, 80)',
					'rgb(154, 205, 50)',
					'rgb(255, 69, 0)',
					'rgb(46, 139, 87)',
					'rgb(218, 165, 32)',
					'rgb(210, 105, 30)',
					'rgb(95, 158, 160)',
					'rgb(30, 144, 255)',
					'rgb(255, 105, 180)',
					'rgb(138, 43, 226)',
					'rgb(0, 255, 127)'
					];
var	randomColorsChosen = {};
var	clientOptions = {
	options: {
		debug: true,
		clientId: '' //<your-app-client-id> *Needed if you want to post messages for another account
	},
	connection: {
		reconnect: true,
		secure: true
	},
	identity: {
		username: 'justinfan123', //Anon account
		password: 'oath:' //oath:<your-bot-oauth>
	},
	channels: channels
}

// Client Vars //
const client = new tmi.client(clientOptions);
client.avatarMinUpdateInterval = 2000; // seconds
client.avatarWidth = 64;
client.avatarHeight = 64;
client.avatarMsgPosY = -154;
client.avatarBasePosY = 75;
client.zIndex = 0;
client.oldWindowHeight = window.innerHeight;

///////////////////
// Listeners //////
///////////////////
client.addListener('message', handleChat);
client.addListener('timeout', timeout);
client.addListener('clearchat', clearChat);
client.addListener('hosting', hosting);
client.addListener('unhost', function(channel, viewers) { hosting(channel, null, viewers, true) });

client.addListener('connecting', function (address, port) {
	if (showConnectionNotices) chatNotice('Connecting', 1000, -4, 'chat-connection-good-connecting');
});
client.addListener('logon', function () {
	if (showConnectionNotices) chatNotice('Authenticating', 1000, -3, 'chat-connection-good-logon');
});
client.addListener('connectfail', function () {
	if (showConnectionNotices) chatNotice('Connection failed', 1000, 3, 'chat-connection-bad-fail');
});
client.addListener('connected', function (address, port) {
	if (showConnectionNotices) chatNotice(`Connected to ${document.channelName}`, 1000, -2, 'chat-connection-good-connected');
	joinAnnounced = [];
});
client.addListener('disconnected', function (reason) {
	if (showConnectionNotices) chatNotice('Disconnected: ' + (reason || ''), 3000, 2, 'chat-connection-bad-disconnected');
});
client.addListener('reconnect', function () {
	if (showConnectionNotices) chatNotice('Reconnected', 1000, 'chat-connection-good-reconnect');
});
// User joined channel
client.addListener('join', function (channel, username) {
	//if(showConnectionNotices) chatNotice('Joined ' + capitalize(dehash(channel)) + ' => ' + username, 1000, -1, 'chat-room-join');
	joinAnnounced.push(channel);
	playAudio(SoundJoin);
	addChattersList(username);
	addAvatar(chatters, chatters.indexOf(username));
});
// User left channel
client.addListener('part', function (channel, username) {
	const index = joinAnnounced.indexOf(channel);

	if (index > -1) {
		//if(showConnectionNotices) chatNotice('Departed ' + capitalize(dehash(channel)) + ' => ' + username, 1000, 3, 'chat-room-part');
		joinAnnounced.splice(joinAnnounced.indexOf(channel), 1);
		playAudio(SoundLeave);
	}

	removeChattersList(username);
});
// Recieved chatters list in channel. May be sent multiple times in large channels.
// Each list is partial, not an updated all-inclusive list, so add each list to array upon event trigger.
client.addListener('names', function (channel, users) {
	console.log('Users list updated: ' + users);

	let s = '';
	for (let index = 0; index < users.length; index++) {
		let e = users[index] + ', ';
		s += e;
		if (users[index] !== chatters[index]) { addAvatar(users, index); }
	}

	chatNotice('Users: ' + s, 1000, 1, 'chat-room-part');
	getChattersList(users);
});
// Crash
client.addListener('crash', function () {
	chatNotice('Crashed', 10000, 4, 'chat-crash');
});

///////////////////
// Logic //////////
///////////////////

/**
 * Logic for handling user resizing window
 */
function handleWindowResizeEvent() {
	resetAvatarPosY();
	// Prevent scrollbar from unlocking.
	lockChatScroll( document.getElementById('uber-chat') );
}

/**
 * Clean the channel name of extraneous chars from server
 * @param {*} channel
 */
function dehash(channel) {
	return channel.replace(/^#/, '');
}

function capitalize(n) {
	return n[0].toUpperCase() + n.substr(1);
}

function htmlEntities(html) {
	function it() {
		return html.map(function(n, i, arr) {
			if(n.length == 1) {
				return n.replace(/[\u00A0-\u9999<>\&]/gim, function(i) {
						return '&#'+i.charCodeAt(0)+';';
					});
			}
			return n;
		});
	}
	var isArray = Array.isArray(html);
	if(!isArray) {
		html = html.split('');
	}
	html = it(html);
	if(!isArray) html = html.join('');
	return html;
}

function formatEmotes(text, emotes) {
	var splitText = text.split('');
	for(var i in emotes) {
		var e = emotes[i];
		for(var j in e) {
			var mote = e[j];
			if(typeof mote == 'string') {
				mote = mote.split('-');
				mote = [parseInt(mote[0]), parseInt(mote[1])];
				var length =  mote[1] - mote[0],
					empty = Array.apply(null, new Array(length + 1)).map(function() { return '' });
				splitText = splitText.slice(0, mote[0]).concat(empty).concat(splitText.slice(mote[1] + 1, splitText.length));
				splitText.splice(mote[0], 1, '<img class="emoticon" src="http://static-cdn.jtvnw.net/emoticons/v1/' + i + '/3.0">');
			}
		}
	}
	return htmlEntities(splitText).join('')
}

function badges(chan, user, isBot) {

	function createBadge(name) {
		var badge = document.createElement('div');
		badge.className = 'chat-badge-' + name;
		badge.title = name;
		return badge;
	}

	var chatBadges = document.createElement('span');
	chatBadges.className = 'chat-badges';

	if (!isBot) {
		if(user.username == chan) {
			chatBadges.appendChild(createBadge('broadcaster'));
		}
		if(user['user-type']) {
			chatBadges.appendChild(createBadge(user['user-type']));
		}
		if(user.turbo) {
			chatBadges.appendChild(createBadge('turbo'));
		}
		if(user.subscriber) {
			let e = createBadge('subscriber');
			if (user.badges.subscriber > 0) {
				e.innerHTML = user.badges.subscriber;
			}
			else {
				e.style.padding = '0px';
			}
			chatBadges.appendChild(e);
		}
		if(user.badges != null && user.badges.bits > 0) {
			let e = createBadge('bits');
			e.innerHTML = user.badges.bits;
			chatBadges.appendChild(e);
		}
		if(user.badges != null && typeof user.badges['bits-leader'] != 'undefined') {
			let e = createBadge('bits-leader');
			e.innerHTML = user.badges['bits-leader'];
			chatBadges.appendChild(e);
		}
		if(user.badges != null && user.badges.premium) {
			chatBadges.appendChild(createBadge('premium'));
		}
		//console.log(user);
	} else {
		chatBadges.appendChild(createBadge('bot'));
	}

	return chatBadges;
}

/**
 * Set the color of user based on presence
 * @param {*} status
 */
function setUserColor(status) {
	// Joined=green | Left=red | Unchange=white
	let colors = ['rgb(25, 229, 161)', 'rgb(206, 65, 65)', 'rgb(150, 150, 150)'];
	if (status === true) {return colors[0]}
	else if (status === -1) {return colors[2]}
	else {return colors[1]}
}

/**
 * Update the chat render
 * @param level Status level of the user
 * @param name Name of user
 */
function updateChat(level, name) {
	var elements = document.getElementById('uber-chat').children;
	//console.log('e: '+elements.length );

	for (let i = 0; i < elements.length; i++) {
		//console.log('Passed username' + name);
		//console.log('DIV username' + elements[i].dataset.username);

		if (name === elements[i].dataset.username) {
			elements[i].dataset.level = level;
		}
	}
}

// Helper func, put formatted html into chatters DIV
function setChatters() {
	// Convert html array to string
	let stringList = '';
	htmlChatters.forEach(function (user) {
		stringList += user[0];
	});
	// Add chatters list to html
	document.getElementById("viewers").innerHTML = chatters.length;
	document.getElementById("chatters-list").innerHTML = stringList;
}

/**
 * Show initial list of chatters in html
 */
function showChatters() {
	// Parse list, add to html formatted array
	htmlChatters = [];
	var level = 0;

	chatters.forEach(function (user) {
		var u = `<span style="color: white">` + user + '</span>' + '<br>';
		htmlChatters.push([u, level]);
	});

	setChatters();
	// Update chat message names
	updateChat(level, '');
}

// Re-style color of chatter based on status
function editChatters(chatter, status) {
	// Edit user style
	var col = setUserColor(status);
	// Search and delete
	let i = 0;
	htmlChatters.forEach(function (user){
		if (user[0].includes(chatter) === true) {
			htmlChatters.splice(i, 1);
		}
		i += 1;
	});
	// Add to array with new style
	var e, level;
	if (status === true) {
		e = `<span style="color: ${col}">` + chatter + '</span>' + '<br>';
		level = -1;
	}
	else if (status === false) {
		e = `<span style="color: ${col}">` + chatter + '</span>' + '<br>';
		level = 3;
	}
	htmlChatters.push([e, level]);

	setChatters();
	// Update chat message names
	updateChat(level, chatter);
}

// GET list of chatters in channel
function getChattersList(list) {
	chatters.push.apply(chatters, list); //add array from 'list' to 'chatters' array
	chatNotice('Num viewers: ' + chatters.length, 1000, -1, 'chat-room-part');
	showChatters();
}

// Remove user from chatters list
function removeChattersList(user) {
	let index = chatters.indexOf(user);
	if (index > -1 && chatters.length > 0) {
		chatters.splice(index, 1);
		editChatters(user, false);
		chatNotice('Removed ' + user + ' ::: ' + 'viewers: ' + chatters.length, 1000, 3, 'chat-room-part');
		removeAvatar(user);
	}
}

// Add user to chat list
function addChattersList(user) {
	console.log(`User ${user} joined...`);
	chatters.push(user);
	editChatters(user, true);
	chatNotice('Added ' + user + ' ::: ' +'viewers: ' + chatters.length, 1000, -1, 'chat-room-part');
}

// Return status level by user's name
function lookUpChatterStatus(name) {
	for (let i = 0; i < htmlChatters.length; i++) {
		let ind = htmlChatters[i, 0].indexOf(name);
		//console.log(name + ind);

		if (ind > -1) {
			return htmlChatters[i, 1];
		}
		else {return 0}
	}
}

/**
 * Main loop for chat functionality
 * @param channel
 * @param user
 * @param message
 * @param self
 */
function handleChat(channel, user, message, self) {
	playAudio(SoundMessage);

	// Ref to chat messages container
	let div = document.getElementById('uber-chat');

	var chan = dehash(channel),
		name = user.username,
		chatLine = document.createElement('span'),
		chatChannel = document.createElement('span'),
		chatName = document.createElement('span'),
		chatColon = document.createElement('span'),
		avatarMessageContainer = document.getElementById(`${name}-name`),
		avatar = document.getElementById(`${name}-container`),
		avatarMessage = document.getElementById(`${name}-message`),
		avatarImage = document.getElementById(name),
		chatMessage = document.createElement('span');

	// Set Chatter Name color
	var color = setUserColor(-1);
	var nameColor = useColor ? user.color : 'inherit';
	if (nameColor === null) {
		if (!randomColorsChosen.hasOwnProperty(chan)) {
			randomColorsChosen[chan] = {};
		}
		if(randomColorsChosen[chan].hasOwnProperty(name)) {
			nameColor = randomColorsChosen[chan][name];
		}
		else {
			// Assign random color to chatter
			nameColor = defaultColors[Math.floor(Math.random()*defaultColors.length)];
			randomColorsChosen[chan][name] = nameColor;
		}
	}

	chatLine.className = 'chat-line chat-notice';
	chatLine.dataset.username = name;
	chatLine.dataset.channel = channel;

	if (user['message-type'] == 'action') {
		chatLine.className += ' chat-action';
	}

	chatChannel.className = 'chat-channel';
	chatChannel.innerHTML = chan;

	chatName.className = 'chat-name chat-line chat-notice';

	// Get color level
	var level = lookUpChatterStatus(name);
	chatLine.dataset.level = level;
	chatName.style.color = color;
	chatName.innerHTML = user['display-name'] || name;

	chatColon.className = 'chat-colon';

	chatMessage.className = 'chat-message';

	chatMessage.style.color = color;
	chatMessage.innerHTML = showEmotes ? formatEmotes(message, user.emotes) : htmlEntities(message);

	if (client.opts.channels.length > 1 && showChannel) chatLine.appendChild(chatChannel);
	chatLine.appendChild(chatName);
	if (showBadges) chatLine.appendChild(badges(chan, user, self));
	//chatLine.appendChild(chatColon);
	chatLine.appendChild( document.createElement('br') );
	chatLine.appendChild(chatMessage);

	// Add chat message node to messages container
	div.appendChild(chatLine);
	div.appendChild( document.createElement('br') ); // Add a line break between each msg so they line down vertically

	if (typeof fadeDelay == 'number') {
		setTimeout(function() {
				chatLine.dataset.faded = '';
			}, fadeDelay);
	}

	// Prevent chat length from going over limit
	let maxChatLength = 300;
	if (div.children.length > maxChatLength) {
		var oldMessages = [].slice.call(div.children).slice(0, 10);
		for (var i in oldMessages) oldMessages[i].remove();
	}

	lockChatScroll(div);

	// Set the message on the avatar speech bubble
	if (message.length > 0 && avatarMessageContainer) {
		avatarMessageContainer.style.opacity = 1;
	}

	if (message.length > 0 && avatarMessage) {
		avatarMessage.style.opacity = 1;
		avatarMessage.innerHTML = message;
		// avatar.style.zIndex = 30; // Draw above other avatars
		// avatarImage.style.zIndex = 20;

		// Remove previous timer
		clearTimeout(avatarMessage.messageTimer);

		// Fade out the message after X seconds
		avatarMessage.messageTimer = setTimeout( ()=> {
			if (avatarMessage) {
				avatarMessage.style.opacity = 0;
			}
			if (avatarMessageContainer) {
				avatarMessageContainer.style.opacity = 0;
			}
			// avatar.style.zIndex = 20; // Reset depth to default
			// avatarImage.style.zIndex = 10;
		}, 8000);
	}
}

/**
 * Auto Scroll to bottom of page if already at bottom
 * @param {HTMLElement} element
 */
function lockChatScroll(element) {
	let scrollH = (element.scrollTop + element.offsetHeight)+120;
	if (scrollH >= element.scrollHeight || element.offsetHeight == element.scrollHeight)
	{
		element.scrollTo(0, element.scrollHeight);
	}
}

/**
 * Show debug messages in side panel
 * @param {string} information Message text to display
 * @param {number} noticeFadeDelay How long to take to fade the message to grey
 * @param {number} level Status level of user
 * @param {string} additionalClasses Styles
 */
function chatNotice(information, noticeFadeDelay, level, additionalClasses) {
	var ele = document.createElement('div');

	ele.className = 'chat-line chat-notice';
	ele.innerHTML = information;

	if (additionalClasses !== undefined) {
		if (Array.isArray(additionalClasses)) {
			additionalClasses = additionalClasses.join(' ');
		}
		ele.className += ' ' + additionalClasses;
	}

	if (typeof level == 'number' && level != 0) {
		ele.dataset.level = level;
	}

	chat.appendChild(ele);
	chat.appendChild( document.createElement('br') );

	if (typeof noticeFadeDelay == 'number') {
		setTimeout(function() {
				ele.dataset.faded = '';
			}, noticeFadeDelay || 500);
	}

	return ele;
}

function timeout(channel, username) {
	if (!doTimeouts) return false;
	if (!recentTimeouts.hasOwnProperty(channel)) {
		recentTimeouts[channel] = {};
	}
	if (!recentTimeouts[channel].hasOwnProperty(username) || recentTimeouts[channel][username] + 1000*10 < +new Date) {
		recentTimeouts[channel][username] = +new Date;
		chatNotice(capitalize(username) + ' was timed-out in ' + capitalize(dehash(channel)), 1000, 1, 'chat-delete-timeout')
	}
	var toHide = document.querySelectorAll('.chat-line[data-channel="' + channel + '"][data-username="' + username + '"]:not(.chat-timedout) .chat-message');
	for (var i in toHide) {
		var h = toHide[i];
		if (typeof h == 'object') {
			h.innerText = '<Message deleted>';
			h.parentElement.className += ' chat-timedout';
		}
	}
}

function clearChat(channel) {
	if (!doChatClears) return false;
	var toHide = document.querySelectorAll('.chat-line[data-channel="' + channel + '"]');
	for (var i in toHide) {
		var h = toHide[i];
		if (typeof h == 'object') {
			h.className += ' chat-cleared';
		}
	}
	chatNotice('Chat was cleared in ' + capitalize(dehash(channel)), 1000, 1, 'chat-delete-clear')
}

function hosting(channel, target, viewers, unhost) {
	if (!showHosting) return false;
	if (viewers == '-') viewers = 0;
	var chan = dehash(channel);
	chan = capitalize(chan);
	if (!unhost) {
		var targ = capitalize(target);
		chatNotice(chan + ' is now hosting ' + targ + ' for ' + viewers + ' viewer' + (viewers !== 1 ? 's' : '') + '.', null, null, 'chat-hosting-yes');
	}
	else {
		chatNotice(chan + ' is no longer hosting.', null, null, 'chat-hosting-no');
	}
}

/**
 * Add a chat avatar
 * @param {string} user The id of the user
 */
function addAvatar(users, index) {
	const user = users[index];
	const avatarsContainer = document.getElementById('chat-avatar-container');
	const avatarArray = avatarsContainer.children;
	const userIndex = users.indexOf(user);
	client.zIndex += 0.25;
	const zIndex = client.zIndex;

	// Check number of instances, prevent further draw
	//if (avatarArray.length > 1) { return; }

	// Create avatar parent node
	const chatAvatar = document.createElement('div');
	chatAvatar.className = 'chat-avatar';
	chatAvatar.id = `${user}-container`;
	const avatarPosY = getAvatarPosY(zIndex);
	chatAvatar.style.top = avatarPosY + 'px';
	chatAvatar.style.zIndex = zIndex;
	chatAvatar.setAttribute('zdepth', zIndex);
	chatAvatar.setAttribute('index', index);

	// Create avatar image
	const chatAvatarImage = document.createElement('div');
	chatAvatarImage.id = user;
	chatAvatarImage.className = 'chat-avatar-image';
	chatAvatarImage.facingDir = 1; // Right
	chatAvatarImage.style.width  = client.avatarWidth;
	chatAvatarImage.style.height = client.avatarHeight;
	chatAvatarImage.style.transform  = `scale(${chatAvatarImage.facingDir}, 2)`;
	const randSpriteIndex = Math.floor(Math.random() * (avatarSprites.length - 1) );
	chatAvatarImage.style.backgroundImage = avatarSprites[randSpriteIndex];
	chatAvatar.appendChild(chatAvatarImage);
	avatarsContainer.appendChild(chatAvatar);
	// Add a name container to avatar
	const nameContainer = document.createElement('span');
	nameContainer.id = `${user}-name`;
	const randHue = Math.floor(Math.random() * 360);
	nameContainer.style.color = `hsl(${randHue}, 75%, 70%)`;
	const msgPosY = client.avatarMsgPosY - Math.floor(Math.random() * 100);
	nameContainer.style.top = `${msgPosY}px`;
	nameContainer.style.opacity = 0;
	nameContainer.className = 'chat-avatar-name';
	nameContainer.innerHTML = user;
	chatAvatar.appendChild(nameContainer);
	// Add message container to avatar
	const messageContainer = document.createElement('div');
	messageContainer.id = `${user}-message`;
	messageContainer.className = 'chat-avatar-message';
	messageContainer.innerHTML = 'A message...';
	nameContainer.appendChild(messageContainer);

	// Set the update timer
	const maxTime = 6000;
	const randSecond = Math.floor(Math.random() * maxTime); // add 0-max sec
	const randInterval = Math.min( maxTime, client.avatarMinUpdateInterval + randSecond );

	chatAvatarImage.updateInterval = setInterval(() => {
		avatarMove(user);
	}, randInterval);

	// Add avatar to container
	avatarsContainer.appendChild(chatAvatar);

	// Init movement
	avatarMove(user);
}

/**
 * Remove an avatar
 * @param {string} id
 */
function removeAvatar(id) {
	const avatarsContainer = document.getElementById('chat-avatar-container');
	const avatarImage = document.getElementById(id);
	clearInterval(avatarImage.updateInterval); // Remove update listener
	const avatar = document.getElementById(`${id}-container`);
	if (avatarsContainer) {
		if (avatar) {
			avatarsContainer.removeChild(avatar); // Message & Name
		}
		if (avatarImage) {
			avatarsContainer.removeChild(avatarImage); // Char image
		}
	}
	chatters[chatters.indexOf(id)] = null; // replace value in array with null
}

/**
 * Avatar logic main loop
 * @param {string} id
 */
function avatarMove(id) {
	const avatarImage = document.getElementById(id);
	const avatarContainer = document.getElementById(`${id}-container`);
	const ind = chatters.indexOf(id);

	if (!avatarImage || !avatarContainer) {return;}

	const avatarName = document.getElementById(`${id}-name`);
	const avatarMessage = document.getElementById(`${id}-message`);
	const scale = 2;
	const positionAndFacing = getRandPosX(avatarImage);
	const randX = positionAndFacing[0];
	const facingDir = positionAndFacing[1] * scale;

	// Set facing direction
	avatarImage.facingDir = facingDir;
	// Update avatar image
	avatarImage.style.transform = `scale(${avatarImage.facingDir}, ${Math.abs(avatarImage.facingDir)})`;
	// Update parent container
	avatarContainer.style.transition = 'left 2s ease-in-out';
	avatarContainer.style.left = randX + 'px';

	// Set message bubble position
	if (avatarMessage.style.opacity <= 0) {
		avatarMessage.style.display = 'none';
		avatarName.style.display = 'none';
	} else {
		avatarMessage.style.display = 'block';
		avatarName.style.display = 'block';
	}
	const containerCenter = (avatarContainer.clientWidth) / 2;
	const nameCenter = parseInt(avatarName.clientWidth, 10) / 2;
	const currPos = parseInt(avatarContainer.clientLeft, 10);
	const center = currPos - nameCenter + (client.avatarWidth / 2);
	avatarName.style.left = `${center}px`;
}

/**
 * Get a random X position on screen
 */
function getRandPosX(container) {
	let pos;
	const bool = Math.round(Math.random() * 2) % 2; // Pick true or false
	const randBaseScale = (Math.random() * 5) * 100;
	let randOffset = Math.round(Math.random() * randBaseScale); // random val 0-scale
	randOffset = Math.max(50, randOffset); // minimum
	const windowWidthMin = 32; // Left screen bound
	const windowWidthMax = window.innerWidth - client.avatarWidth - 32; // Right screen bound
	let facing = 1;

	if ( bool === 0 ) {
		pos = parseInt(container.getBoundingClientRect().left, 10) - randOffset;
		if (pos < windowWidthMin) { pos = windowWidthMin + 32; }
		facing = -1;
	} else {
		pos = parseInt(container.getBoundingClientRect().right, 10) + randOffset;
		if (pos > windowWidthMax) { pos = windowWidthMax - 32; }
		facing = 1;
	}

	return [pos, facing];
}

/**
 * Get the fixed avatar Y position
 */
function getAvatarPosY(index) {
	const Y = window.innerHeight - client.avatarBasePosY - client.avatarHeight + index;
	return Y;
}

/**
 * Move avatars back to correct Y Position when window is resizing
 */
function resetAvatarPosY() {
	// const diff = window.innerHeight - client.oldWindowHeight;
	// console.log(diff);

	const container = document.getElementById('chat-avatar-container');
	const children = container.children;

	for (let i = 0; i < children.length; i++) {
		const avatar = children[i];
		const sort = i*0.25;
		avatar.style.top = getAvatarPosY(sort) + 'px';
	}
}

/**
 * Play specified audio sample
 * @param audio
 */
function playAudio(audio) {
	// Check if muted
	if (!audioMute) {audio.play()}
}

/**
 * Mute the audio
 * @param btn
 */
function muteMe(btn) {
	let val;
	if (btn.value === 'false') {
		val = true;
		btn.value = val;
		btn.innerHTML = '🔇 UNMUTE';
	} else if (btn.value === 'true') {
		val = false;
		btn.value = val;
		btn.innerHTML = '🔊 MUTE';
	}
	// Set global
	audioMute = val;
}

/**
 * Button logic to hide a menu
 * @param menuName HTML element of menu to show/hide
 * @param button Ref to button element
 */
function hideMenu(menuName, button) {
	const menu = document.getElementById(menuName);
	const contentContainer = button.firstChild;

	// Set display state of menu element
	if (button.value === 'false') {
		menu.style.display = 'inline-block';
		button.value = 'true';
	} else {
		menu.style.display = 'none';
		button.value = 'false';
	}

	// If both viewers and debug windows hidden, expand chat window horizontally
	const chattersMenu = document.getElementById('chatters');
	const debugMenu = document.getElementById('chat');
	const sidebarMenu = document.getElementById('sidebar');
	const chatMenu = document.getElementById('uber-chat');

	if (chattersMenu.style.display === 'none' && debugMenu.style.display === 'none') {
		sidebarMenu.style.display = 'none';
	} else {
		sidebarMenu.style.display = 'grid';
	}

	if (chattersMenu.style.display === 'none' || debugMenu.style.display === 'none') {
		sidebarMenu.style.gridTemplateRows = '1fr';
	} else {
		sidebarMenu.style.gridTemplateRows = '1fr 1fr';
	}

	// Change icon/text on buttons each press
	if (button.value === 'false') {contentContainer.innerHTML = `🔳 Show ${button.name}`}
	else {contentContainer.innerHTML = `🔲 Hide ${button.name}`}
}

/**
 * Login
 */
function login() {
	// Validate entries
	const ch = document.forms["loginForm"]["channel-name"].value;
	//var cid = document.forms["loginForm"]["client-id"].value;
	//var usr = document.forms["loginForm"]["username"].value;
	//var pss = document.forms["loginForm"]["password"].value;

	if (ch == "") //|| cid == "" || pss == "" || usr == ""
	{
		alert("Please input a Value");
	} else {
		console.log('Accepted');

		// Input Accepted
		//
		// Set vars
		channels.push( ch.toLowerCase() );
		document.channelName = ch.toLowerCase();
		//clientOptions.options.clientId = document.getElementById("client").value;
		//clientOptions.identity.username = (document.getElementById("uname").value).toLowerCase();
		//clientOptions.identity.password = document.getElementById("pword").value;

		//** Execute **//
		client.connect();

		// Show App
		document.getElementById('container').style.display = 'flex';
		document.getElementById('container').style.display = '-webkit-flex';
		document.getElementById('button-container').style.display = 'block';
		// Hide login
		document.getElementById('login-container').style.display = 'none';
	}
}
