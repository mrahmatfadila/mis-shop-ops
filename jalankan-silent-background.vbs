Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
strDir = FSO.GetParentFolderName(WScript.ScriptFullName)
batPath = Chr(34) & strDir & "\jalankan-server.bat" & Chr(34)
logPath = Chr(34) & strDir & "\server_background.log" & Chr(34)
WshShell.CurrentDirectory = strDir
WshShell.Run "cmd /c call " & batPath & " --background > " & logPath & " 2>&1", 0, False
