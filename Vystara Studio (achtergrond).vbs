Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = fso.GetParentFolderName(WScript.ScriptFullName)
' Start de Studio zonder zichtbaar venster en opent hem in je browser.
sh.Run "cmd /c node app.mjs > studio.log 2>&1", 0, False
