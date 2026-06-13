const moment = require("moment-timezone");
const Log = require("logger");

const CalendarFetcherUtils = {

	/**
	 * Get local timezone.
	 * @returns {string} timezone
	 */
	getLocalTimezone () {
		return moment.tz.guess();
	},

	/**
	 * Checks if an event is a full-day event.
	 * @param {object} event The event object to check.
	 * @returns {boolean} True if the event is a full-day event.
	 */
	isFullDayEvent (event) {
		if (event.start.length === 8 || event.start.dateOnly || event.datetype === "date") {
			return true;
		}
		const start = event.start || 0;
		const startDate = new Date(start);
		const end = event.end || 0;
		if ((end - start) % (24 * 60 * 60 * 1000) === 0 && startDate.getHours() === 0 && startDate.getMinutes() === 0) {
			return true;
		}
		return false;
	},

	/**
	 * Gets the title from the event.
	 * @param {object} event The event object.
	 * @returns {string} The title of the event.
	 */
	getTitleFromEvent (event) {
		if (event.summary) {
			return typeof event.summary.val !== "undefined" ? event.summary.val : event.summary;
		} else if (event.description) {
			return event.description;
		}
		return "Event";
	},

	/**
	 * Determines whether a title matches an exclusion filter.
	 * @param {string} title The event title.
	 * @param {string|object} filterConfig The filter config.
	 * @returns {boolean} True if the event should be excluded.
	 */
	shouldEventBeExcluded (title, excludedEvents) {
		for (const filterConfig of excludedEvents) {
			let filter = filterConfig;
			let testTitle = title.toLowerCase();
			let useRegex = false;
			let regexFlags = "gi";

			if (filter instanceof Object) {
				useRegex = filter.regex || false;
				filter = useRegex ? filter.filterBy : filter.filterBy.toLowerCase();
			} else {
				filter = filter.toLowerCase();
			}

			const matched = useRegex
				? new RegExp(filter, regexFlags).test(testTitle)
				: testTitle.includes(filter);

			if (matched) return true;
		}
		return false;
	},

	/**
	 * Filters iCal events for display in MagicMirror.
	 * @param {object} data Parsed iCal data.
	 * @param {object} config Filter configuration.
	 * @returns {object[]} Filtered and sorted events.
	 */
	filterEvents (data, config) {
		const newEvents = [];
		const now = moment();
		const pastLocalMoment = now.clone();
		const futureLocalMoment = now.clone().startOf("day").add(config.maximumNumberOfDays, "days").subtract(1, "seconds");

		Object.entries(data).forEach(([key, event]) => {
			if (event.type !== "VEVENT") return;

			const title = CalendarFetcherUtils.getTitleFromEvent(event);
			Log.debug(`Processing: ${title}`);

			if (CalendarFetcherUtils.shouldEventBeExcluded(title, config.excludedEvents)) return;

			const localTz = CalendarFetcherUtils.getLocalTimezone();
			const startMoment = event.start.tz
				? moment.tz(event.start, event.start.tz)
				: moment.tz(event.start, localTz);

			const fullDay = CalendarFetcherUtils.isFullDayEvent(event);
			const eventStartMoment = fullDay ? startMoment.startOf("day") : startMoment;

			let eventEndMoment;
			if (typeof event.end !== "undefined") {
				eventEndMoment = event.end.tz
					? moment.tz(event.end, event.end.tz)
					: moment.tz(event.end, localTz);
			} else if (typeof event.duration !== "undefined") {
				eventEndMoment = eventStartMoment.clone().add(moment.duration(event.duration));
			} else {
				eventEndMoment = fullDay ? eventStartMoment.clone().endOf("day") : eventStartMoment.clone();
			}

			// Skip events outside our window
			if (eventEndMoment.isBefore(pastLocalMoment) || eventStartMoment.isAfter(futureLocalMoment)) return;

			Log.debug(`Saving event: ${title}`);
			newEvents.push({
				title: title,
				startDate: eventStartMoment.format("x"),
				endDate: eventEndMoment.format("x"),
				fullDayEvent: fullDay,
				recurringEvent: false,
				class: event.class,
				firstYear: event.start.getFullYear(),
				description: event.description || false
			});
		});

		newEvents.sort((a, b) => a.startDate - b.startDate);
		return newEvents;
	},

	/**
	 * Shortens a string if it exceeds maxLength, appending an ellipsis.
	 * Kept here for compatibility — primary shorten logic is in calendarutils.js.
	 * @param {string} string Text to shorten.
	 * @param {number} maxLength Max character length.
	 * @returns {string} Shortened string.
	 */
	shorten (string, maxLength) {
		if (typeof string !== "string") return "";
		if (maxLength && string.length > maxLength) {
			return `${string.trim().slice(0, maxLength)}…`;
		}
		return string.trim();
	}
};

if (typeof module !== "undefined") {
	module.exports = CalendarFetcherUtils;
}