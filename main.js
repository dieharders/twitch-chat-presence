//** Forked: https://gist.github.com/AlcaDesign/742d8cb82e3e93ad4205 **//

var channels = [], // Channels to initially join
	fadeDelay = 5000, // Set to false to disable chat fade
	showChannel = true, // Show respective channels if the channels is longer than 1
	useColor = true, // Use chatters' colors or to inherit
	showBadges = true, // Show chatters' badges
	showEmotes = true, // Show emotes in the chat
	doTimeouts = true, // Hide the messages of people who are timed-out
	doChatClears = true, // Hide the chat from an entire channel
	showHosting = true, // Show when the channel is hosting or not
	showConnectionNotices = true; // Show messages like "Connected" and "Disconnected"

var chat = document.getElementById('chat'),
	defaultColors = ['rgb(255, 0, 0)','rgb(0, 0, 255)','rgb(0, 128, 0)','rgb(178, 34, 34)','rgb(255, 127, 80)','rgb(154, 205, 50)','rgb(255, 69, 0)','rgb(46, 139, 87)','rgb(218, 165, 32)','rgb(210, 105, 30)','rgb(95, 158, 160)','rgb(30, 144, 255)','rgb(255, 105, 180)','rgb(138, 43, 226)','rgb(0, 255, 127)'],
	randomColorsChosen = {},
	clientOptions = {
		options: {
			debug: true,
			clientId: '<your-app-client-id>'
		},
		connections: {
			reconnect: true
		},
		identity: {
			username: '<your-bot-username>',
			password: 'oath:<your-bot-password>'
		},
		channels: channels
	},
	client = new tmi.client(clientOptions);

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
		return badge;
	}
	
	var chatBadges = document.createElement('span');
	chatBadges.className = 'chat-badges';
	
	if(!isBot) {
		if(user.username == chan) {
			chatBadges.appendChild(createBadge('broadcaster'));
		}
		if(user['user-type']) {
			chatBadges.appendChild(createBadge(user['user-type']));
		}
		if(user.turbo) {
			chatBadges.appendChild(createBadge('turbo'));
		}
	}
	else {
		chatChanges.appendChild(createBadge('bot'));
	}
	
	return chatBadges;
}

// Set the color of user based on presence
function setUserColor(status) {
	// Joined=green | Left=red | Unchange=white
	let colors = ['rgb(25, 229, 161)', 'rgb(206, 65, 65)', 'rgb(150, 150, 150)'];
	if (status === true) {return colors[0]}
	else if (status === -1) {return colors[2]}
	else {return colors[1]}
}

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

// Chatter monitoring arrays
var chatters = [];
var htmlChatters = [];
// Helper func, put formatted html into chatters DIV
function setChatters() {
	// Convert html array to string
	let stringList = '';
	htmlChatters.forEach(function (user) {		
		stringList += user[0];
	});
	// Add chatters list to html
	let title = '<span class="viewers">' + chatters.length + '</span>';
	document.getElementById("chatters").innerHTML = title + stringList;
}

// Show initial list of chatters in html.
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
	}
}
// Add user to chat list
function addChattersList(user) {
	chatters.push(user);
	editChatters(user, true);
	chatNotice('Added ' + user + ' ::: ' +'viewers: ' + chatters.length, 1000, -1, 'chat-room-part');
}

// Return level by name
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

function handleChat(channel, user, message, self) {
	let div = document.getElementById('uber-chat');

	var chan = dehash(channel),
		name = user.username,
		chatLine = document.createElement('div'),
		chatChannel = document.createElement('span'),
		chatName = document.createElement('span'),
		chatColon = document.createElement('span'),
		chatMessage = document.createElement('span');
	
	// Chatter color
	var color = setUserColor(-1);
	/*
	var color = useColor ? user.color : 'inherit';
	if(color === null) {
		if(!randomColorsChosen.hasOwnProperty(chan)) {
			randomColorsChosen[chan] = {};
		}
		if(randomColorsChosen[chan].hasOwnProperty(name)) {
			color = randomColorsChosen[chan][name];
		}
		else {
			// Assign random color to chatter
			color = defaultColors[Math.floor(Math.random()*defaultColors.length)];
			randomColorsChosen[chan][name] = color;
		}
	}
	*/
	
	chatLine.className = 'chat-line chat-notice';
	chatLine.dataset.username = name;
	chatLine.dataset.channel = channel;
	
	if(user['message-type'] == 'action') {
		chatLine.className += ' chat-action';
	}
	
	chatChannel.className = 'chat-channel';
	chatChannel.innerHTML = chan;
	
	chatName.className = 'chat-name chat-line chat-notice';

	// Get color level	
	var level = lookUpChatterStatus(name);
	chatLine.dataset.level = level;
	//chatName.style.color = color;
	chatName.innerHTML = user['display-name'] || name;
	
	chatColon.className = 'chat-colon';
	
	chatMessage.className = 'chat-message';
	
	chatMessage.style.color = color;
	chatMessage.innerHTML = showEmotes ? formatEmotes(message, user.emotes) : htmlEntities(message);

	if(client.opts.channels.length > 1 && showChannel) chatLine.appendChild(chatChannel);
	if(showBadges) chatLine.appendChild(badges(chan, user, self));
	chatLine.appendChild(chatName);
	chatLine.appendChild(chatColon);
	chatLine.appendChild(chatMessage);
	
	div.appendChild(chatLine);
	
	if(typeof fadeDelay == 'number') {
		setTimeout(function() {
				chatLine.dataset.faded = '';
			}, fadeDelay);
	}
	
	let maxChatLength = 300;
	if(div.children.length > maxChatLength) {
		var oldMessages = [].slice.call(div.children).slice(0, 10);
		for(var i in oldMessages) oldMessages[i].remove();
	}

	// Scroll to bottom of page
	div.scrollTo(0, div.scrollTop = div.scrollHeight);
}

function chatNotice(information, noticeFadeDelay, level, additionalClasses) {
	var ele = document.createElement('div');
	
	ele.className = 'chat-line chat-notice';
	ele.innerHTML = information;
	
	if(additionalClasses !== undefined) {
		if(Array.isArray(additionalClasses)) {
			additionalClasses = additionalClasses.join(' ');
		}
		ele.className += ' ' + additionalClasses;
	}
	
	if(typeof level == 'number' && level != 0) {
		ele.dataset.level = level;
	}
	
	chat.appendChild(ele);
	
	if(typeof noticeFadeDelay == 'number') {
		setTimeout(function() {
				ele.dataset.faded = '';
			}, noticeFadeDelay || 500);
	}
	
	return ele;
}

var recentTimeouts = {};

function timeout(channel, username) {
	if(!doTimeouts) return false;
	if(!recentTimeouts.hasOwnProperty(channel)) {
		recentTimeouts[channel] = {};
	}
	if(!recentTimeouts[channel].hasOwnProperty(username) || recentTimeouts[channel][username] + 1000*10 < +new Date) {
		recentTimeouts[channel][username] = +new Date;
		chatNotice(capitalize(username) + ' was timed-out in ' + capitalize(dehash(channel)), 1000, 1, 'chat-delete-timeout')
	};
	var toHide = document.querySelectorAll('.chat-line[data-channel="' + channel + '"][data-username="' + username + '"]:not(.chat-timedout) .chat-message');
	for(var i in toHide) {
		var h = toHide[i];
		if(typeof h == 'object') {
			h.innerText = '<Message deleted>';
			h.parentElement.className += ' chat-timedout';
		}
	}
}
function clearChat(channel) {
	if(!doChatClears) return false;
	var toHide = document.querySelectorAll('.chat-line[data-channel="' + channel + '"]');
	for(var i in toHide) {
		var h = toHide[i];
		if(typeof h == 'object') {
			h.className += ' chat-cleared';
		}
	}
	chatNotice('Chat was cleared in ' + capitalize(dehash(channel)), 1000, 1, 'chat-delete-clear')
}
function hosting(channel, target, viewers, unhost) {
	if(!showHosting) return false;
	if(viewers == '-') viewers = 0;
	var chan = dehash(channel);
	chan = capitalize(chan);
	if(!unhost) {
		var targ = capitalize(target);
		chatNotice(chan + ' is now hosting ' + targ + ' for ' + viewers + ' viewer' + (viewers !== 1 ? 's' : '') + '.', null, null, 'chat-hosting-yes');
	}
	else {
		chatNotice(chan + ' is no longer hosting.', null, null, 'chat-hosting-no');
	}
}

///////////////////
//** Execution **//
///////////////////
client.addListener('message', handleChat);
client.addListener('timeout', timeout);
client.addListener('clearchat', clearChat);
client.addListener('hosting', hosting);
client.addListener('unhost', function(channel, viewers) { hosting(channel, null, viewers, true) });

client.addListener('connecting', function (address, port) {
		if(showConnectionNotices) chatNotice('Connecting', 1000, -4, 'chat-connection-good-connecting');
	});
client.addListener('logon', function () {
		if(showConnectionNotices) chatNotice('Authenticating', 1000, -3, 'chat-connection-good-logon');
	});
client.addListener('connectfail', function () {
		if(showConnectionNotices) chatNotice('Connection failed', 1000, 3, 'chat-connection-bad-fail');
	});
client.addListener('connected', function (address, port) {
		if(showConnectionNotices) chatNotice('Connected', 1000, -2, 'chat-connection-good-connected');
		joinAccounced = [];
	});
client.addListener('disconnected', function (reason) {
		if(showConnectionNotices) chatNotice('Disconnected: ' + (reason || ''), 3000, 2, 'chat-connection-bad-disconnected');
	});
client.addListener('reconnect', function () {
		if(showConnectionNotices) chatNotice('Reconnected', 1000, 'chat-connection-good-reconnect');
	});
// User joined channel
client.addListener('join', function (channel, username) {
	if(username != client.getUsername()) {
		//if(showConnectionNotices) chatNotice('Joined ' + capitalize(dehash(channel)) + ' => ' + username, 1000, -1, 'chat-room-join');
		joinAccounced.push(channel);

		addChattersList(username);
	}
});
// User left channel
client.addListener('part', function (channel, username) {
	var index = joinAccounced.indexOf(channel);
	if(index > -1) {
		//if(showConnectionNotices) chatNotice('Parted ' + capitalize(dehash(channel)) + ' => ' + username, 1000, 3, 'chat-room-part');
		joinAccounced.splice(joinAccounced.indexOf(channel), 1);
	}

	removeChattersList(username);
});
// Recieved chatters list in channel. May be sent multiple times in large channels.
// Each list is partial, not an updated all-inclusive list, so add each list to arrray upon event trigger.
client.addListener('names', function (channel, users) {
	//console.log('Users list: '+users);
	chatNotice('Users: ' + users, 1000, 1, 'chat-room-part');
	getChattersList(users);
});
// Crash
client.addListener('crash', function () {
	chatNotice('Crashed', 10000, 4, 'chat-crash');
});

//////////////////////
// Buttons
function hideMe(ele) {
	var e = document.getElementById(ele); //ele.children[0].id
	var dis = e.style.display;
	if (dis === 'none') {
		e.style.display = 'inline-block';
	} else {
		e.style.display = 'none';
	}
	// If both viewers and debug windows hidden
	if (document.getElementById('chatters').style.display === 'none' && document.getElementById('chat').style.display === 'none') {
		document.getElementById('sidebar').style.display = 'none';
	} else {
		document.getElementById('sidebar').style.display = 'flex';
	}
	
	//console.log('hidden ' + ele.id + ' ' + e.hidden);
}
// Login //
function login() {
	// Validate entries
	var ch = document.forms["loginForm"]["channel-name"].value;
	var cid = document.forms["loginForm"]["client-id"].value;	
	var usr = document.forms["loginForm"]["username"].value;
	var pss = document.forms["loginForm"]["password"].value;
	if (ch == "" || cid == "" || usr == "" || pss == "")
	{
		alert("Please input a Value");
		return false;
	}
	else 
	{
		// Input Accepted
		alert('Accepted. Logging in...');
		// Set vars
		channels.push( (document.getElementById("channel").value).toLowerCase() );
		clientOptions.options.clientId = document.getElementById("client").value;
		clientOptions.identity.username = (document.getElementById("uname").value).toLowerCase();
		clientOptions.identity.password = document.getElementById("pword").value;

		//** Execute **//
		client.connect();

		// Show App
		document.getElementById('container').style.display = 'flex';
		document.getElementById('button-container').style.display = 'block';
		// Hide login
		document.getElementById('login').style.display = 'none';
	}
}