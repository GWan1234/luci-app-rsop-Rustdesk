'use strict';
'require view';
'require rpc';
'require poll';
'require ui';

var callLogRead = rpc.declare({
	object: 'log',
	method: 'read',
	params: [ 'lines', 'grep' ],
	expect: { log: [] }
});

function formatTime(ts) {
	if (!ts)
		return '';

	var d = new Date(ts * 1000);

	return '%02d:%02d:%02d'.format(d.getHours(), d.getMinutes(), d.getSeconds());
}

return view.extend({
	logElement: null,

	load: function() {
		this.refreshLog = this.refreshLog.bind(this);
		poll.add(this.refreshLog, 5);

		return Promise.resolve();
	},

	render: function() {
		this.logElement = E('textarea', {
			'class': 'cbi-input-textarea',
			'readonly': 'readonly',
			'rows': '24',
			'style': 'width:100%; font-family:monospace'
		});

		this.refreshLog();

		return E('div', { 'class': 'cbi-map' }, [
			E('h2', { 'class': 'cbi-map-title' }, _('Service Logs')),
			E('p', { 'class': 'cbi-map-descr' },
				_('Logs mentioning rsop, hbbs or hbbr are shown below. The page refreshes automatically every 5 seconds.')),
			E('div', { 'class': 'cbi-section' }, [
				this.logElement,
				E('div', { 'class': 'cbi-section-actions' }, [
					E('button', {
						'class': 'cbi-button cbi-button-action',
						'click': ui.createHandlerFn(this, 'refreshLog')
					}, _('Refresh'))
				])
			])
		]);
	},

	refreshLog: function(ev) {
		var self = this;

		return callLogRead(300, 'rsop|hbbs|hbbr').then(function(data) {
			var entries = (data && data.log) ? data.log : [];
			var lines = [];

			entries.sort(function(a, b) {
				return (a.id || 0) - (b.id || 0);
			});

			for (var i = 0; i < entries.length; i++) {
				var entry = entries[i];
				var source = entry.source || 'log';
				var msg = entry.msg || '';

				if (!/rsop|hbbs|hbbr/i.test(source + ' ' + msg))
					continue;

				lines.push('%s %s: %s'.format(formatTime(entry.time), source, msg));
			}

			self.logElement.value = lines.length
				? lines.join('\n')
				: _('No log entries yet.');

			if (self.logElement.scrollHeight)
				self.logElement.scrollTop = self.logElement.scrollHeight;
		}).catch(function(e) {
			ui.addNotification(null, E('p', _('Failed to load logs: %s').format(e.message)));
		});
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
