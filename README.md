# MagicMirror Canvas Calendar
This is a module for `MagicMirror²` which displays upcoming assignments from the Canvas LMS via the built-in iCal calendar feed. No API token is required. The Canvas LMS is used by colleges, universities and other institutions for coursework.

## Installation
1. Clone this repository into your MagicMirror `modules` folder.
```
cd /MagicMirror/modules
git clone https://github.com/dbeltjr/MMM-CanvasCalendar.git
cd MMM-CanvasCalendar
npm install
```

2. Get your Canvas iCal feed URL. In Canvas, go to **Calendar → Calendar Feed** (bottom left of the calendar page). Copy the URL shown.

3. Edit your configuration file under `config/config.js` with the following configuration.
```
{
  module: "MMM-CanvasCalendar",
  position: "top_right",
  header: "Assignments | OT 511 | PP500",
  config: {
    maximumEntries: 5,
    maximumNumberOfDays: 365,
    maxTitleLength: 50,
    fontSize: "small",
    keywordColors: [
      { keyword: "OT 511", color: "lightsalmon" },
      { keyword: "PP500",  color: "cyan" },
    ],
    calendars: [
      { url: "https://yourschool.instructure.com/feeds/calendars/user_XXXXX.ics" }
    ],
  }
},
```

## Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `maximumEntries` | Maximum number of assignments to display | `10` |
| `maximumNumberOfDays` | How many days into the future to show assignments | `365` |
| `maxTitleLength` | Maximum characters before the title is truncated with `…` | `50` |
| `fetchInterval` | How often to refresh the feed in milliseconds | `3600000` (1 hour) |
| `fontSize` | Size of the assignment list text. Options: `xsmall`, `small`, `medium`, `large`, `xlarge` | `small` |
| `keywordColors` | Array of `{keyword, color}` objects. Any assignment title containing the keyword will be colored. Accepts any CSS color value. | `[]` |
| `excludedEvents` | Array of strings. Any assignment whose title contains one of these strings will be hidden. | `[]` |
| `hideTime` | If `true`, hides the time portion of non-full-day events | `false` |
| `showTimeToday` | If `true`, shows the time for events due today instead of "Today" | `false` |
| `calendars` | Array of calendar objects. Each requires a `url` pointing to a Canvas iCal feed. | `[]` |

## Color Coding
The `keywordColors` array drives color coding for both the assignment list and the module header. Any keyword found in the header string will also be colorized, so your header doubles as a color-coded legend.

```
header: "Assignments | OT 511 | PP500",
keywordColors: [
  { keyword: "OT 511", color: "lightsalmon" },
  { keyword: "PP500",  color: "cyan" },
],
```

This accepts all CSS color values. Named colors like `lightsalmon`, `cyan`, and `lightgreen` work well for readability on a dark background. See [CSS Colors](https://www.w3schools.com/colors/default.asp) for the full list.

## Hiding Assignments
If there are assignments you do not want displayed, add any part of the title to `excludedEvents`:
```
excludedEvents: [
  "Student Introductions",
  "Course Preparation Verification",
],
```
Any assignment whose title contains that text will be hidden from the list.

## Notes
- The Canvas iCal feed does not include submission status. Completed assignments will remain visible until their due date has passed.
- The feed updates on Canvas's own schedule (typically within minutes of changes). MagicMirror polls the feed every hour by default, configurable via `fetchInterval`.
- If your institution has locked down API token generation, this module is designed as a token-free alternative using the standard iCal feed.

## Credits
MagicMirror²: [MagicMirror²](https://github.com/MichMich/MagicMirror)

Original MMM-Canvas module: [dbeltjr/MMM-Canvas](https://github.com/dbeltjr/MMM-Canvas)

Based on the MagicMirror² default Calendar module: [MagicMirrorOrg/MagicMirror](https://github.com/MagicMirrorOrg/MagicMirror)