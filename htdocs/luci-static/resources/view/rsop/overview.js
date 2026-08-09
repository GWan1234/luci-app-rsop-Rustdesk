"use strict";
"require view";
"require rpc";
"require fs";
"require ui";
"require poll";

var isReadonlyView = !L.hasViewPermission() || null;

var callRcInit = rpc.declare({
  object: "rc",
  method: "init",
  params: ["name", "action"],
});

var callRcList = rpc.declare({
  object: "rc",
  method: "list",
  expect: { "": {} },
});

var callServiceList = rpc.declare({
  object: "service",
  method: "list",
  params: ["name"],
  expect: { "": {} },
});

return view.extend({
  badge: null,
  rows: {},
  keyInput: null,
  keyNote: null,
  startBtn: null,
  stopBtn: null,

  load: function () {
    this.refreshStatus = this.refreshStatus.bind(this);
    poll.add(this.refreshStatus, 5);

    return Promise.resolve();
  },

  render: function () {
    var self = this;

    this.badge = E("span", { class: "label label-danger" }, _("Checking..."));
    this.rows = {};

    var table = E("table", { class: "cbi-section-table" }, [
      E("tr", { class: "tr table-titles" }, [
        E("th", { class: "th" }, _("Process")),
        E("th", { class: "th" }, _("Status")),
        E("th", { class: "th" }, _("PID")),
      ]),
    ]);

    ["rsop", "hbbs", "hbbr"].forEach(function (name) {
      var span = E("span", { class: "label label-danger" }, _("Stopped"));
      var pid = E("span", {}, "-");

      self.rows[name] = { span: span, pid: pid };

      table.appendChild(
        E("tr", { class: "tr" }, [
          E("td", { class: "td" }, E("code", {}, name)),
          E("td", { class: "td" }, span),
          E("td", { class: "td" }, pid),
        ]),
      );
    });

    this.startBtn = E(
      "button",
      {
        class: "cbi-button cbi-button-action important",
        click: ui.createHandlerFn(this, "handleAction", true),
        disabled: true,
      },
      _("Start"),
    );

    this.stopBtn = E(
      "button",
      {
        class: "cbi-button cbi-button-action important",
        click: ui.createHandlerFn(this, "handleAction", false),
        disabled: true,
      },
      _("Stop"),
    );

    this.keyInput = E("textarea", {
      class: "cbi-input-textarea",
      readonly: "readonly",
      rows: "3",
      placeholder: _("Not available"),
    });

    this.keyNote = E(
      "div",
      { class: "alert-message warning" },
      _("No key yet. Start the service once to generate it."),
    );

    var view = E("div", { class: "cbi-map" }, [
      E("h2", { class: "cbi-map-title" }, _("RustDesk Server")),
      E(
        "div",
        { class: "cbi-map-descr" },
        _("Manage the RustDesk Server running on this device."),
      ),

      E("fieldset", { class: "cbi-section" }, [
        E("legend", {}, _("Service Status")),
        E("div", { class: "cbi-section-descr" }, [
          _("Overall"),
          ": ",
          this.badge,
        ]),
        table,
        E("div", { class: "cbi-section-actions" }, [
          this.startBtn,
          " ",
          this.stopBtn,
        ]),
      ]),

      E("fieldset", { class: "cbi-section" }, [
        E("legend", {}, _("Server Key")),
        E(
          "div",
          { class: "cbi-section-descr" },
          _(
            "The server key is generated on the first start and stored at /etc/rustdesk/id_ed25519.pub.",
          ),
        ),
        this.keyInput,
        E("div", { class: "cbi-section-actions" }, [
          E(
            "button",
            {
              class: "cbi-button cbi-button-action",
              click: ui.createHandlerFn(this, "handleCopyKey"),
              disabled: isReadonlyView || null,
            },
            _("Copy"),
          ),
        ]),
        this.keyNote,
      ]),

      E("fieldset", { class: "cbi-section" }, [
        E("legend", {}, _("Public Access")),
        E(
          "div",
          { class: "alert-message warning" },
          _(
            "If you cannot connect to your RustDesk Server from the public internet, please make sure that TCP and UDP ports 21114-21119 are opened in the firewall and forwarded to this device.",
          ),
        ),
      ]),
    ]);

    this.refreshStatus();

    return view;
  },

  setStatus: function (found, running, instances) {
    if (running) {
      this.badge.className = "label label-success";
      this.badge.textContent = _("Running");
    } else {
      this.badge.className = "label label-danger";
      this.badge.textContent = _("Stopped");
    }

    this.startBtn.disabled = isReadonlyView || running;
    this.stopBtn.disabled = isReadonlyView || !found || !running;

    for (var name in this.rows) {
      var inst = instances && instances[name] ? instances[name] : null;
      var row = this.rows[name];

      if (inst && inst.running) {
        row.span.className = "label label-success";
        row.span.textContent = _("Running");
        row.pid.textContent = inst.pid || "-";
      } else {
        row.span.className = "label label-danger";
        row.span.textContent = _("Stopped");
        row.pid.textContent = "-";
      }
    }
  },

  refreshStatus: function () {
    var self = this;

    return callServiceList("rsop")
      .then(function (data) {
        var svc = data && data.rsop ? data.rsop : null;
        var instances = svc && svc.instances ? svc.instances : {};
        var total = 0,
          running = 0;

        for (var name in instances) {
          total++;
          if (instances[name].running) running++;
        }

        self.setStatus(svc != null, total > 0 && running == total, instances);
      })
      .catch(function () {
        return callRcList()
          .then(function (data) {
            var svc = data && data.rsop ? data.rsop : null;

            self.setStatus(svc != null, !!(svc && svc.running), null);
          })
          .catch(function () {
            self.setStatus(false, false, null);
          });
      })
      .then(function () {
        return fs.read("/etc/rustdesk/id_ed25519.pub");
      })
      .then(function (key) {
        self.keyInput.value = (key || "").trim();
        self.keyNote.className = "alert-message info";
        self.keyNote.textContent = _(
          "The server key is generated on the first start and stored at /etc/rustdesk/id_ed25519.pub.",
        );
      })
      .catch(function () {
        self.keyInput.value = "";
        self.keyNote.className = "alert-message warning";
        self.keyNote.textContent = _(
          "No key yet. Start the service once to generate it.",
        );
      });
  },

  handleAction: function (start, ev) {
    var self = this;

    if (
      !start &&
      !confirm(_("Are you sure you want to stop the RustDesk Server?"))
    )
      return;

    this.startBtn.disabled = true;
    this.stopBtn.disabled = true;

    callRcInit("rsop", start ? "start" : "stop")
      .then(function (ret) {
        var ok = !ret;

        ui.addNotification(
          null,
          E(
            "p",
            {},
            ok
              ? start
                ? _("Service started.")
                : _("Service stopped.")
              : start
                ? _("Failed to start the service.")
                : _("Failed to stop the service."),
          ),
        );

        self.refreshStatus();
      })
      .catch(function (e) {
        ui.addNotification(
          null,
          E(
            "p",
            {},
            (start
              ? _("Failed to start the service.")
              : _("Failed to stop the service.")) +
              ": " +
              (e.message || ""),
          ),
        );

        self.refreshStatus();
      });
  },

  handleCopyKey: function (ev) {
    var value = this.keyInput.value;

    if (!value) return;

    var done = function (ok) {
      ui.addNotification(
        null,
        E("p", {}, ok ? _("Copied!") : _("Copy failed")),
      );
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(value).then(
        function () {
          done(true);
        },
        function () {
          done(false);
        },
      );
    } else {
      this.keyInput.focus();
      this.keyInput.select();

      try {
        done(document.execCommand("copy"));
      } catch (e) {
        done(false);
      }
    }
  },

  handleSaveApply: null,
  handleSave: null,
  handleReset: null,
});
