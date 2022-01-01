let privates = require("./private.js");

const Discord = require("discord.js");
const client = new Discord.Client();

let messageHistory = [];
let reminderHistory = [];
let channelId = privates.channelId;

function removeOldMessages() {
    console.log("Removing old messages...");

    let currentDate = new Date();
    process.stdout.write("Current time: ");
    console.log(currentDate);

    for (let i = messageHistory.length - 1; i >= 0; i--) {
        let message = messageHistory[i];
        if (message.date < currentDate) {
            //Delete message
            try {
                client.channels.cache
                    .get(message.channelId)
                    .messages
                    .fetch(message.id)
                    .then(oldMessage => oldMessage.delete());
            }
            catch (error) {
                process.stdout.write("Failed to delete message for ");
                console.log(message.date);
            }

            //Add reminder for removal in 5 minutes
            function addReminderToHistory(reminder) {
                let fiveMinutesLater = new Date();
                fiveMinutesLater.setMinutes(fiveMinutesLater.getMinutes() + 5);
                let reminderData = {
                    messageId: reminder.id,
                    channelId: reminder.channel.id,
                    removalDate: fiveMinutesLater
                }
                reminderHistory.push(reminderData);
            }

            //Create reminder message
            client.channels.cache
                .get(message.channelId)
                .send(message.detail + " meeting at chamber " + message.chamberNum + " in 5 minutes!")
                .then(reminder => addReminderToHistory(reminder));

            //Remove message from history
            messageHistory.splice(i, 1);

            //Log
            process.stdout.write("Deleted message for ");
            console.log(message.date);
        }
    }

    for (let i = reminderHistory.length - 1; i >= 0; i--) {
        let reminder = reminderHistory[i];
        if (reminder.removalDate < currentDate) {
            //Delete reminder
            try {
                client.channels.cache
                    .get(reminder.channelId)
                    .messages
                    .fetch(reminder.messageId)
                    .then(oldReminder => oldReminder.delete());
            }
            catch (error) {
                process.stdout.write("Failed to delete reminder for ");
                console.log(reminder.removalDate);
            }

            //Remove reminder from history
            reminderHistory.splice(i, 1);

            //Log
            process.stdout.write("Deleted reminder for ");
            console.log(reminder.removalDate);
        }
    }
    console.log();

    setTimeout(removeOldMessages, 10000);
}

function sendErrorMessage(channel, note) {
    channel.send("Uhh... This is awkward. Something went wrong either because there's an issue with the command you entered or because <@!525150014998183946> did a bad job programming me. Here's my best guess at the problem: " + note + ".");
}

function addMessage(message) {
    if (message.channel.id !== channelId) {
        return;
    }
    let lowerCaseMessage = message.content.toLowerCase();
    if (lowerCaseMessage === "schedule help") {
        return;
    }

    // Separate parts with commas
    let messageParts = message.content.split(",");
    for (let i = 0; i < messageParts.length; ++i) {
        messageParts[i] = messageParts[i].trim();
    }

    let chamberNumWords = messageParts[0].toLowerCase().split(" ");
    if (chamberNumWords[0] !== "schedule") {
        return;
    }
    if (messageParts.length < 3) {
        sendErrorMessage(message.channel, "command too short");
        return;
    }
    if (message.content.length < 40) {
        sendErrorMessage(message.channel, "command too short");
        return;
    }
    if (chamberNumWords[1] !== "chamber") {
        sendErrorMessage(message.channel, "missing \"chamber\"");
        return;
    }

    let chamberNum = parseInt(chamberNumWords[2]);
    if (chamberNum < 1 || chamberNum > 8) {
        sendErrorMessage(message.channel, "invalid chamber number");
        return;
    }

    let meetingDetail = messageParts[1];

    let meetingTimingWords = messageParts[2].split(" ");
    if (meetingTimingWords.length !== 3 && meetingTimingWords.length !== 4) {
        sendErrorMessage(message.channel, "invalid date or time");
        return;
    }

    let date = meetingTimingWords[meetingTimingWords.length - 3];
    let dateElements = date.split("/");
    if (dateElements.length !== 3) {
        sendErrorMessage(message.channel, "invalid date");
        return;
    }

    let month = dateElements[0];
    if (month.length === 1) {
        month = "0" + month;
    }

    let day = dateElements[1];
    if (day.length === 1) {
        day = "0" + day;
    }

    let year = dateElements[2];

    if (isNaN(month) || isNaN(day) || isNaN(year)) {
        sendErrorMessage(message.channel, "invalid date");
        return;
    }

    let time = meetingTimingWords[meetingTimingWords.length - 2];
    let hour = "";
    let minute = "";
    if (time.length === 4) {
        if (time.charAt(1) !== ":") {
            sendErrorMessage(message.channel, "invalid time");
            return;
        }
        hour = time.charAt(0);
        minute = time.charAt(2) + time.charAt(3)
    }
    else if (time.length === 5) {
        if (time.charAt(2) !== ":") {
            sendErrorMessage(message.channel, "invalid time");
            return;
        }
        hour = time.charAt(0) + time.charAt(1);
        minute = time.charAt(3) + time.charAt(4)
    }
    if (isNaN(hour) || isNaN(minute)) {
        sendErrorMessage(message.channel, "invalid time");
        return;
    }

    let amOrPm = meetingTimingWords[meetingTimingWords.length - 1].toLowerCase();
    if (amOrPm !== "am" && amOrPm !== "pm") {
        sendErrorMessage(message.channel, "\"AM\" or \"PM\" not found");
        return;
    }

    let hourNum = Number(hour);
    if (amOrPm === "pm") {
        if (hourNum !== 12) {
            hourNum += 12;
        }
    }
    else {
        if (hourNum === 12) {
            hourNum += 12;
        }
    }

    let eventDate = new Date();
    eventDate.setMonth(Number(month) - 1);
    eventDate.setDate(Number(day));
    eventDate.setFullYear(Number(year));
    eventDate.setHours(hourNum);
    eventDate.setMinutes(Number(minute));
    eventDate.setSeconds(0);
    eventDate.setMilliseconds(0);

    let fiveMinutesBefore = new Date(eventDate);
    fiveMinutesBefore.setMinutes(eventDate.getMinutes() - 5);

    let messageData = {
        id: message.id,
        channelId: message.channel.id,
        detail: meetingDetail,
        chamberNum: chamberNum,
        date: fiveMinutesBefore
    };
    messageHistory.push(messageData);

    console.log("New event scheduled:");
    console.log(messageData);
    console.log();
}

client.once("ready", () => {
    console.log("Bot is ready!\n");

    //Add previously scheduled meetings
    client.channels.cache
        .get(channelId).messages
        .fetch()
        .then(messages => messages.each(message => addMessage(message)));

    removeOldMessages();
});

client.on("message", message => {
    if (message.content.toLowerCase() === "schedule help") {
        if (message.channel.id == channelId) {
            message.channel.send("Event Scheduler usage: Schedule chamber [number], [notes], [day of week (optional)] [MM/DD/YYYY] [time] [AM | PM]");
        }
    }
    else {
        addMessage(message);
    }
});

client.login(privates.token);
