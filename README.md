# rsop
Rustdesk Server for OpenWrt
## 🚀 Features
- Built-in latest version of Rustdesk-Server and always200OKserver.
- It can run smoothly with just a few lines of commands.
- It can be set as a daemon process and start automatically on boot.
## ⬇️ Downloads
[GitHub Release](https://github.com/moaeiou/rsop/releases)
## 📚 How to use
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
[Generic Document](https://867678.xyz/doc/OpenWrt)
It is assumed that you are already in the SDK root directory.

Additional operations are required on the source code:
```
cd ⚠️sdk-root/package/rsop/root/etc/rustdesk
rm DONOTREMOVE
wget "https://github.com/rustdesk/rustdesk-server/releases/latest/download/rustdesk-server-linux-⚠️ARCH.zip"

```
## ⚖️ License
This project was licensed under the [GNU Affero General Public License Version 3 (AGPL-3.0)](https://www.gnu.org/licenses/agpl-3.0.html).

This project has included the [RustDesk-Server](https://github.com/rustdesk/rustdesk-server).