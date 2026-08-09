"use strict";
"require dom";
"require poll";
"require rpc";
"require view";

var callLogRead = rpc.declare({
  object: "log",
  method: "read",
  params: ["lines", "grep"],
  expect: { log: [] },
});

function formatTime(ts) {
  if (!ts) return "";

  var d = new Date(ts * 1000);

  return "%02d:%02d:%02d".format(d.getHours(), d.getMinutes(), d.getSeconds());
}

return view.extend({
  render: function () {
    var css =
      "					\
			#log_textarea {				\
				padding: 10px;			\
				text-align: left;		\
			}					\
			#log_textarea pre {			\
				padding: .5rem;			\
				word-break: break-all;		\
				margin: 0;			\
			}";

    var log_textarea = E(
      "div",
      { id: "log_textarea" },
      E(
        "img",
        {
          src: L.resource("icons/loading.svg"),
          alt: _("Loading..."),
          style: "vertical-align:middle",
        },
        _("Collecting data..."),
      ),
    );

    poll.add(
      L.bind(function () {
        return callLogRead(300, "rsop|hbbs|hbbr")
          .then(function (data) {
            var entries = data && data.log ? data.log : [];
            var lines = [];

            entries.sort(function (a, b) {
              return (a.id || 0) - (b.id || 0);
            });

            for (var i = 0; i < entries.length; i++) {
              var entry = entries[i];
              var source = entry.source || "log";
              var msg = entry.msg || "";

              if (!/rsop|hbbs|hbbr/i.test(source + " " + msg)) continue;

              lines.push(
                "%s %s: %s".format(formatTime(entry.time), source, msg),
              );
            }

            dom.content(
              log_textarea,
              E("pre", { wrap: "pre" }, [
                lines.length ? lines.join("\n") : _("Log is empty."),
              ]),
            );
          })
          .catch(function (err) {
            dom.content(
              log_textarea,
              E("pre", { wrap: "pre" }, [
                _("Failed to load logs: %s").format(err),
              ]),
            );
          });
      }),
    );

    return E([
      E("style", [css]),
      E("div", { class: "cbi-map" }, [
        E("div", { class: "cbi-section" }, [
          E("h2", { class: "cbi-map-title" }, _("Service Logs")),
          log_textarea,
          E(
            "div",
            { style: "text-align:right" },
            E(
              "small",
              {},
              _("Refresh every %s seconds.").format(L.env.pollinterval),
            ),
          ),
        ]),
      ]),
    ]);
  },

  handleSaveApply: null,
  handleSave: null,
  handleReset: null,
});
