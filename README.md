# Event-Scheduler

### Setup

Before running this bot, be sure to create a `private.js` file that exports a `channelId` for the channel to receive bot commands as well as a bot `token`.

### Usage

Schedule a meeting in a numbered channel (referred to as a "chamber"), with:

```
Schedule chamber [number], [notes], [day of week (optional)] [MM/DD/YYYY] [time] [AM | PM]
```

A notification is sent five minutes prior to the event.