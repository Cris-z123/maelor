!macro customCheckAppRunning
  DetailPrint `Closing running "${PRODUCT_NAME}" processes...`
  !ifdef INSTALL_MODE_PER_ALL_USERS
    nsExec::Exec `taskkill /f /t /im "${APP_EXECUTABLE_FILENAME}"`
  !else
    nsExec::Exec `%SYSTEMROOT%\System32\cmd.exe /c taskkill /f /t /im "${APP_EXECUTABLE_FILENAME}" /fi "USERNAME eq %USERNAME%"`
  !endif
  Sleep 1000
!macroend

!macro customUnInstall
  ${if} ${isUpdated}
    DetailPrint `Skipping user data removal during application update.`
    Return
  ${endif}

  DetailPrint `Removing "${PRODUCT_NAME}" user data...`

  ${if} $installMode == "all"
    SetShellVarContext current
  ${endif}

  RMDir /r "$APPDATA\${APP_FILENAME}"
  !ifdef APP_PRODUCT_FILENAME
    RMDir /r "$APPDATA\${APP_PRODUCT_FILENAME}"
  !endif
  !ifdef APP_PACKAGE_NAME
    RMDir /r "$APPDATA\${APP_PACKAGE_NAME}"
  !endif

  RMDir /r "$LOCALAPPDATA\${APP_FILENAME}"
  !ifdef APP_PRODUCT_FILENAME
    RMDir /r "$LOCALAPPDATA\${APP_PRODUCT_FILENAME}"
  !endif
  !ifdef APP_PACKAGE_NAME
    RMDir /r "$LOCALAPPDATA\${APP_PACKAGE_NAME}"
  !endif

  ${if} $installMode == "all"
    SetShellVarContext all
  ${endif}
!macroend
