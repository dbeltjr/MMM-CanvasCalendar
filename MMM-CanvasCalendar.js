/* Magic Mirror
 * Module: MMM-CanvasCalendar
 *
 * By Dale Belt
 *
 */

Module.register("MMM-CanvasCalendar", {

	defaults: {
		maximumEntries: 10,
		maximumNumberOfDays: 365,
		maxTitleLength: 50,
		fetchInterval: 60 * 60 * 1000,
		animationSpeed: 2000,
		timeFormat: "relative",
		dateFormat: "MMM Do",
		fullDayEventDateFormat: "MMM Do",
		hideTime: false,
		showTimeToday: false,
		excludedEvents: [],
		fontSize: "small", // xsmall, small, medium, large, xlarge
		keywordColors: [], // [{keyword: "OT 511", color: "lightsalmon"}, ...]
		calendars: []
	},

	getStyles () {
		return ["calendar.css"];
	},

	getScripts () {
		return ["calendarutils.js", "moment.js", "moment-timezone.js"];
	},

	getTranslations () {
		return false;
	},

	// Colorize keywords in header and match font size to fontSize config
	getHeader () {
		let header = this.data.header || "";
		for (const kc of this.config.keywordColors) {
			const escaped = kc.keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			const regex = new RegExp(`(${escaped})`, "g");
			header = header.replace(regex, `<span style="color:${kc.color}">$1</span>`);
		}
		const sizeMap = {
			xsmall: "0.75rem",
			small:  "1rem",
			medium: "1.5rem",
			large:  "3.25rem",
			xlarge: "3.75rem"
		};
		const fontSize = sizeMap[this.config.fontSize] || "1rem";
		return `<span style="font-size:${fontSize}">${header}</span>`;
	},

	start () {
		Log.info(`Starting module: ${this.name}`);
		moment.updateLocale(config.language, CalendarUtils.getLocaleSpecification(config.timeFormat));
		this.calendarData = {};
		this.loaded = false;

		this.config.calendars.forEach((calendar) => {
			calendar.url = calendar.url.replace("webcal://", "http://");
			this.addCalendar(calendar.url, calendar.auth, {
				maximumEntries: calendar.maximumEntries,
				maximumNumberOfDays: calendar.maximumNumberOfDays,
				excludedEvents: calendar.excludedEvents,
				fetchInterval: calendar.fetchInterval
			});
		});

		this.selfUpdate();
	},

	notificationReceived (notification, payload) {
		if (notification === "FETCH_CALENDAR" && this.hasCalendarURL(payload.url)) {
			this.sendSocketNotification(notification, { url: payload.url, id: this.identifier });
		}
	},

	socketNotificationReceived (notification, payload) {
		if (this.identifier !== payload.id) return;

		if (notification === "CALENDAR_EVENTS") {
			if (this.hasCalendarURL(payload.url)) {
				if (!this.calendarData[payload.url]) {
					this.calendarData[payload.url] = { events: null, checksum: null };
				}
				this.calendarData[payload.url].events = payload.events;
				this.error = null;
				this.loaded = true;

				if (this.calendarData[payload.url].checksum === payload.checksum) return;
				this.calendarData[payload.url].checksum = payload.checksum;
			}
		} else if (notification === "CALENDAR_ERROR") {
			this.error = this.translate("MODULE_CONFIG_ERROR", {
				MODULE_NAME: this.name,
				ERROR: this.translate(payload.error_type)
			});
			this.loaded = true;
		}

		this.updateDom(this.config.animationSpeed);
	},

	getDom () {
		const validSizes = ["xsmall", "small", "medium", "large", "xlarge"];
		const sizeClass = validSizes.includes(this.config.fontSize) ? this.config.fontSize : "small";

		const wrapper = document.createElement("table");
		wrapper.className = sizeClass;

		if (this.error) {
			wrapper.innerHTML = this.error;
			wrapper.className += " dimmed";
			return wrapper;
		}

		const events = this.createEventList();

		if (events.length === 0) {
			wrapper.innerHTML = this.loaded ? this.translate("EMPTY") : this.translate("LOADING");
			wrapper.className += " dimmed";
			return wrapper;
		}

		const now = moment();

		events.forEach((event) => {
			const startMoment = this.timestampToMoment(event.startDate);
			const endMoment = this.timestampToMoment(event.endDate);

			const eventWrapper = document.createElement("tr");
			eventWrapper.className = "event-wrapper normal event";

			// Title cell
			const titleWrapper = document.createElement("td");
			titleWrapper.className = "title bright";
			titleWrapper.style.textAlign = "left";
			titleWrapper.innerHTML = CalendarUtils.shorten(event.title, this.config.maxTitleLength, false, 1);

			// Apply keyword color coding
			for (const kc of this.config.keywordColors) {
				if (event.title.includes(kc.keyword)) {
					eventWrapper.style.color = kc.color;
					titleWrapper.style.color = kc.color;
					break;
				}
			}

			eventWrapper.appendChild(titleWrapper);

			// Time cell
			const timeWrapper = document.createElement("td");
			timeWrapper.className = "time light";

			if (event.fullDayEvent) {
				if (event.today) {
					timeWrapper.innerHTML = CalendarUtils.capFirst(this.translate("TODAY"));
				} else if (event.tomorrow) {
					timeWrapper.innerHTML = CalendarUtils.capFirst(this.translate("TOMORROW"));
				} else {
					timeWrapper.innerHTML = CalendarUtils.capFirst(startMoment.format(this.config.fullDayEventDateFormat));
				}
			} else {
				if (startMoment.isSameOrAfter(now)) {
					if (!this.config.hideTime) {
						timeWrapper.innerHTML = CalendarUtils.capFirst(startMoment.calendar(null, { sameElse: this.config.dateFormat }));
					} else {
						timeWrapper.innerHTML = CalendarUtils.capFirst(startMoment.calendar(null, {
							sameDay: this.config.showTimeToday ? "LT" : `[${this.translate("TODAY")}]`,
							nextDay: `[${this.translate("TOMORROW")}]`,
							nextWeek: "dddd",
							sameElse: this.config.dateFormat
						}));
					}
				} else {
					timeWrapper.innerHTML = CalendarUtils.capFirst(
						this.translate("RUNNING", {
							fallback: `${this.translate("RUNNING")} {timeUntilEnd}`,
							timeUntilEnd: endMoment.fromNow(true)
						})
					);
				}
			}

			eventWrapper.appendChild(timeWrapper);
			wrapper.appendChild(eventWrapper);
		});

		return wrapper;
	},

	hasCalendarURL (url) {
		return this.config.calendars.some((c) => c.url === url);
	},

	timestampToMoment (timestamp) {
		return moment(timestamp, "x").tz(moment.tz.guess());
	},

	addCalendar (url, auth, calendarConfig) {
		this.sendSocketNotification("ADD_CALENDAR", {
			id: this.identifier,
			url: url,
			excludedEvents: calendarConfig.excludedEvents || this.config.excludedEvents,
			maximumEntries: calendarConfig.maximumEntries || this.config.maximumEntries,
			maximumNumberOfDays: calendarConfig.maximumNumberOfDays || this.config.maximumNumberOfDays,
			fetchInterval: calendarConfig.fetchInterval || this.config.fetchInterval,
			auth: auth,
			broadcastPastEvents: false,
			selfSignedCert: false
		});
	},

	createEventList () {
		const now = moment();
		const future = now.clone().startOf("day").add(this.config.maximumNumberOfDays, "days");
		let events = [];

		for (const calendarUrl in this.calendarData) {
			const calendar = this.calendarData[calendarUrl].events;
			if (!calendar) continue;

			for (const e in calendar) {
				const event = JSON.parse(JSON.stringify(calendar[e]));
				const startMoment = this.timestampToMoment(event.startDate);
				const endMoment = this.timestampToMoment(event.endDate);

				if (endMoment.isBefore(now) || startMoment.isAfter(future)) continue;

				event.url = calendarUrl;
				event.today = startMoment.isSame(now, "d");
				event.tomorrow = startMoment.isSame(now.clone().add(1, "days"), "d");
				events.push(event);
			}
		}

		events.sort((a, b) => a.startDate - b.startDate);
		return events.slice(0, this.config.maximumEntries);
	},

	selfUpdate () {
		const ONE_MINUTE = 60 * 1000;
		setTimeout(() => {
			setInterval(() => {
				Log.debug("[MMM-CanvasCalendar] self update");
				this.updateDom(1);
			}, ONE_MINUTE);
		}, ONE_MINUTE - (new Date() % ONE_MINUTE));
	}
});