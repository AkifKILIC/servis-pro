$ftpServer = "ftp://izmirimteknik.com"
$user = "servispro@izmirimteknik.com"
$pass = "jEZv42CASyU3RLB"
$localDir = "c:\mangaOkuyucu\servis-pro\dist"

function Upload-FtpDir($localPath, $remotePath) {
    Get-ChildItem -Path $localPath | ForEach-Object {
        $item = $_
        $rPath = if ([string]::IsNullOrEmpty($remotePath)) { $item.Name } else { "$remotePath/$($item.Name)" }
        if ($item.PSIsContainer) {
            try {
                $mk = [System.Net.FtpWebRequest]::Create("$ftpServer/$rPath")
                $mk.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
                $mk.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
                $mk.UsePassive = $true
                $mk.KeepAlive = $false
                $resp = $mk.GetResponse()
                $resp.Close()
            } catch {
                # Dir might already exist
            }
            Upload-FtpDir $item.FullName $rPath
        } else {
            $up = [System.Net.FtpWebRequest]::Create("$ftpServer/$rPath")
            $up.Credentials = New-Object System.Net.NetworkCredential($user, $pass)
            $up.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
            $up.UseBinary = $true
            $up.UsePassive = $true
            $up.KeepAlive = $false
            $bytes = [System.IO.File]::ReadAllBytes($item.FullName)
            $up.ContentLength = $bytes.Length
            $stream = $up.GetRequestStream()
            $stream.Write($bytes, 0, $bytes.Length)
            $stream.Close()
            $resp = $up.GetResponse()
            $resp.Close()
            Write-Host "Uploaded: $rPath"
        }
    }
}

Write-Host "Starting FTP Upload to $ftpServer..."
Upload-FtpDir $localDir ""
Write-Host "FTP Upload Complete!"
