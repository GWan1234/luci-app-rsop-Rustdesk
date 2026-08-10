"use strict";
"require fs";
"require poll";
"require rpc";
"require ui";
"require view";

var callServiceList = rpc.declare({
  object: "service",
  method: "list",
  params: ["name"],
  expect: { "": {} },
});

var callRcInit = rpc.declare({
  object: "rc",
  method: "init",
  params: ["name", "action"],
});

var isRunning = false;

async function getServiceStatus() {
  const res = await L.resolveDefault(callServiceList("rsop"), {});
  try {
    return (
      res["rsop"]["instances"]["rsop"]["running"] &&
      res["rsop"]["instances"]["hbbs"]["running"] &&
      res["rsop"]["instances"]["hbbr"]["running"]
    );
  } catch (e) {
    return false;
  }
}

async function getBinaryStatus() {
  const res = await Promise.all([
    L.resolveDefault(fs.stat("/etc/rustdesk/rsop"), null),
    L.resolveDefault(fs.stat("/etc/rustdesk/hbbs"), null),
    L.resolveDefault(fs.stat("/etc/rustdesk/hbbr"), null),
  ]);
  return res[0] != null && res[1] != null && res[2] != null;
}

async function getServerKey() {
  const key = await L.resolveDefault(
    fs.read("/etc/rustdesk/id_ed25519.pub"),
    null,
  );
  return key ? key.trim() : null;
}

function renderStatus(binaryFound, isRunning) {
  var spanTemp = '<span style="color:%s"><strong>%s %s</strong></span>';
  var renderHTML;
  if (!binaryFound) {
    renderHTML = spanTemp.format(
      "orange",
      _("RustDesk Server"),
      _("binary is missing"),
    );
  } else if (isRunning) {
    renderHTML = spanTemp.format(
      "green",
      _("RustDesk Server"),
      _("is running"),
    );
  } else {
    renderHTML = spanTemp.format(
      "red",
      _("RustDesk Server"),
      _("is not running"),
    );
  }
  return renderHTML;
}

async function updateStatus() {
  const res = await Promise.all([
    getBinaryStatus(),
    getServiceStatus(),
    getServerKey(),
  ]);
  var status = document.getElementById("service_status");
  if (status) status.innerHTML = renderStatus(res[0], res[1]);
  var key = document.getElementById("server_key");
  if (key) key.value = res[2] || "";

  isRunning = res[1];
  var cb = document.getElementById("toggle_checkbox");
  if (cb) cb.checked = isRunning;
}

return view.extend({
  render: function () {
    poll.add(
      L.bind(function () {
        return updateStatus();
      }),
    );

    return E("div", { class: "cbi-map" }, [
      E("h2", { class: "cbi-map-title" }, _("RustDesk Server")),
      E("div", { class: "cbi-map-descr" }, [
        _("Rustdesk Server for OpenWrt."),
        E("br"),
        _(
          "If you cannot connect to your RustDesk Server from the public internet, please make sure that TCP and UDP ports 21114-21119 are opened in the firewall and forwarded to this device.",
        ),
      ]),
      E("div", { class: "cbi-section", id: "status_bar" }, [
        E("p", { id: "service_status" }, _("Collecting data...")),
      ]),
      E("div", { class: "cbi-section" }, [
        E("div", { class: "cbi-value" }, [
          E("div", { class: "cbi-value-field" }, [
            E("label", { class: "cbi-checkbox" }, [
              E("input", {
                id: "toggle_checkbox",
                class: "cbi-input-checkbox",
                type: "checkbox",
                change: ui.createHandlerFn(this, "handleToggle"),
              }),
              _("Start Service"),
            ]),
          ]),
        ]),
        E("div", { class: "cbi-value" }, [
          E(
            "label",
            { class: "cbi-value-title", for: "server_key" },
            _("Connection Public Key"),
          ),
          E("div", { class: "cbi-value-field" }, [
            E("div", { style: "width:25%; min-width:200px;" }, [
              E("textarea", {
                id: "server_key",
                class: "cbi-input-textarea",
                readonly: "readonly",
                rows: "2",
                style: "width:100%;",
                placeholder: _(
                  "No key yet. Start the service once to generate it.",
                ),
              }),
              E(
                "button",
                {
                  class: "cbi-button cbi-button-action",
                  style: "margin-top:6px;",
                  click: ui.createHandlerFn(this, "handleCopyKey"),
                },
                _("Copy"),
              ),
            ]),
          ]),
        ]),
      ]),
    ]);
  },

  handleToggle: function (ev) {
    this.applyCheckboxState();
  },

  applyCheckboxState: function () {
    var cb = document.getElementById("toggle_checkbox");
    if (!cb) return Promise.resolve();

    var start = cb.checked;

    var run = L.bind(
      function () {
        return callRcInit("rsop", start ? "start" : "stop")
          .then(function (ret) {
            var ok = !ret;
            if (!ok) cb.checked = !start;

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

            updateStatus();
          })
          .catch(function (e) {
            cb.checked = !start;
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

            updateStatus();
          });
      },
      this,
    );

    if (!start)
      return this.confirmStop().then(function (ok) {
        if (ok) return run();
        cb.checked = true;
        return null;
      });

    return run();
  },

  confirmStop: function () {
    return new Promise(function (resolve) {
      ui.showModal(_("Stop RustDesk Server"), [
        E("p", {}, _("Are you sure you want to stop the RustDesk Server?")),
        E("div", { class: "right" }, [
          E("button", {
            class: "cbi-button",
            click: function (ev) {
              ui.hideModal();
              resolve(false);
            },
          }, _("Cancel")),
          " ",
          E("button", {
            class: "cbi-button cbi-button-negative",
            click: function (ev) {
              ui.hideModal();
              resolve(true);
            },
          }, _("Stop")),
        ]),
      ]);
    });
  },

  handleCopyKey: function (ev) {
    var key = document.getElementById("server_key");
    if (!key || !key.value) return;

    var done = function (ok) {
      ui.addNotification(
        null,
        E("p", {}, ok ? _("Copied!") : _("Copy failed")),
      );
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(key.value).then(
        function () {
          done(true);
        },
        function () {
          done(false);
        },
      );
    } else {
      key.focus();
      key.select();

      try {
        done(document.execCommand("copy"));
      } catch (e) {
        done(false);
      }
    }
  },

  handleSaveApply: function (ev, mode) {
    var cb = document.getElementById("toggle_checkbox");
    if (cb && cb.checked !== isRunning)
      return this.applyCheckboxState();
    return updateStatus();
  },

  handleSave: function (ev) {
    return this.handleSaveApply(ev, "0");
  },

  handleReset: function (ev) {
    return updateStatus();
  },
});
