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
      _("BINARY MISSING"),
    );
  } else if (isRunning) {
    renderHTML = spanTemp.format("green", _("RustDesk Server"), _("RUNNING"));
  } else {
    renderHTML = spanTemp.format("red", _("RustDesk Server"), _("NOT RUNNING"));
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
}

return view.extend({
  render: function () {
    poll.add(
      L.bind(function () {
        return updateStatus();
      }),
    );

    return E("div", { class: "cbi-map" }, [
      E("div", { class: "cbi-section" }, [
        E("h2", { class: "cbi-map-title" }, _("RustDesk Server")),
        E("div", { class: "cbi-map-descr" }, [
          _("Rustdesk Server for OpenWrt."),
          E("br"),
          _(
            "If you cannot connect to your RustDesk Server from the public internet, please make sure that TCP and UDP ports 21114-21119 are opened in the firewall and forwarded to this device.",
          ),
        ]),
        E("p", { id: "service_status" }, _("Collecting data...")),
        E("h3", {}, _("Server Key")),
        E("textarea", {
          id: "server_key",
          class: "cbi-input-textarea",
          readonly: "readonly",
          rows: "3",
          placeholder: _("No key yet. Start the service once to generate it."),
        }),
        E("div", { class: "cbi-section-actions" }, [
          E(
            "button",
            {
              class: "cbi-button cbi-button-action important",
              click: ui.createHandlerFn(this, "handleAction", true),
            },
            _("Start"),
          ),
          " ",
          E(
            "button",
            {
              class: "cbi-button cbi-button-action important",
              click: ui.createHandlerFn(this, "handleAction", false),
            },
            _("Stop"),
          ),
          " ",
          E(
            "button",
            {
              class: "cbi-button cbi-button-action",
              click: ui.createHandlerFn(this, "handleCopyKey"),
            },
            _("Copy"),
          ),
        ]),
      ]),
    ]);
  },

  handleAction: function (start, ev) {
    if (
      !start &&
      !confirm(_("Are you sure you want to stop the RustDesk Server?"))
    )
      return;

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

        updateStatus();
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

        updateStatus();
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

  handleSaveApply: null,
  handleSave: null,
  handleReset: null,
});
