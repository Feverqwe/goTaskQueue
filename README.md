<div align="center">
	<h1>GoTaskQueue</h1>
	<p>
		<b>Simple task runner</b>
	</p>
	<br>
	<br>
	<br>
</div>

Build exe
---
````
go build -ldflags -H=windowsgui -trimpath -o goHFS.exe
````

Build mac app
---
```
./scripts/build.mac.sh
```

Build resources with go-bindata
---
````
./scripts/build.resources.sh
````

File icon, use rsrc 
---
````
.\rsrc_windows_amd64.exe -ico .\icon.ico -o FILE.syso
````
