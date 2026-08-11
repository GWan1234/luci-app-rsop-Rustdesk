# LuCI-APP-Rustdesk for OPenwrt

Rustdesk Server for OpenWrt with LuCI Support.

## 🚀 Features

- Built-in latest version of Rustdesk-Server and always200OKserver.
- It can run smoothly with just a few lines of commands.
- It can be set as a daemon process and start automatically on boot.

## ⬇️ Downloads

[GitHub Release](https://github.com/moaeiou/luci-app-rsop/releases)
[Always OK Server](https://github.com/morouter/luci-app-rsop/releases/tag/Always-200OK-Server)

## 📚 How to use

> This content is outdated and applies only to versions earlier than 0.5.0.

- **Run**:

```
/etc/init.d/rsop start
```

- **Restart**

```
/etc/init.d/rsop restart
```

- **Check running status**:

```
/etc/init.d/rsop status
```

- **Show Rustdesk-Server Key**

```
cat /etc/rustdesk/id_ed25519.pub
```

- **Use the built-in utils to cheking the stats**:

```
/etc/rustdesk/rustdesk-utils doctor localhost
```

- **Automatic startup**
  It usually starts automatically. If it does not start automatically, please execute the command.

```
/etc/init.d/rsop enable
```

## 🛠 How to self-build

[Install, Compile and init-SDK Generic Guide](https://867678.xyz/docs/openwrt)

It is assumed that you are already in the SDK root directory.

Additional operations are required on the source code:

```bash
cd ⚠️sdk-root/package/rsop/root/etc/rustdesk
rm DONOTREMOVE
wget -O rustdesk-server.zip https://github.com/rustdesk/rustdesk-server/releases/latest/download/rustdesk-server-linux-⚠️ARCH.zip
wget -O rsop https://github.com/morouter/luci-app-rsop/releases/download/Always-200OK-Server/rsop-⚠️ARCH-musl
unzip ./rustdesk-server.zip
mv ./⚠️ARCH/hbbr ./
mv ./⚠️ARCH/hbbs ./
mv ./⚠️ARCH/rustdesk-utils ./
rm -rf ./⚠️ARCH ./rustdesk-server.zip DONOTREMOVE ../../go.mod ../../main.go
chmod +x ./hbbr ./hbbs ./rustdesk-utils ./rsop
```

need build the Always 200OK Server?

```bash
git clone git@github.com:morouter/rsop.git
cd rsop
go build
```

## ⚖️ License

This project has been licensed under the [GNU Affero General Public License Version 3 (AGPL-3.0)](https://www.gnu.org/licenses/agpl-3.0.html).

This project has included the [RustDesk-Server](https://github.com/rustdesk/rustdesk-server).

And [The log page](https://github.com/Internet1235/luci-app-openlist/blob/main/luci-app-openlist/htdocs/luci-static/resources/view/openlist/log.js) This project was licensed under the MIT, So in this project I change it to `AGPL-v3`.