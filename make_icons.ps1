Add-Type -AssemblyName System.Drawing

function Create-AppIcon([int]$size, [string]$path) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

    # Dark background
    $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
    $brushBg = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#1c252b"))
    $g.FillRectangle($brushBg, $rect)

    # Terracotta circle accent
    $circleSize = [int]($size * 0.68)
    $offset = [int](($size - $circleSize) / 2)
    $brushCircle = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#de8264"))
    $g.FillEllipse($brushCircle, $offset, $offset, $circleSize, $circleSize)

    # Text SEP 26
    $fontSize = [float]($size * 0.22)
    $font = New-Object System.Drawing.Font("Arial", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $brushText = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $g.DrawString("SEP`n26", $font, $brushText, [float]($size / 2), [float]($size / 2), $sf)

    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Created icon: $path"
}

Create-AppIcon 192 "assets\icon-192.png"
Create-AppIcon 512 "assets\icon-512.png"
