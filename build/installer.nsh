; Se ejecuta durante la instalación (el instalador ya corre como administrador).
; Abre el puerto para que los celulares de los meseros puedan conectarse sin configurar nada.
!macro customInstall
  nsExec::Exec 'netsh advfirewall firewall delete rule name="ISistema Comanda"'
  nsExec::Exec 'netsh advfirewall firewall add rule name="ISistema Comanda" dir=in action=allow protocol=TCP localport=5173 profile=any'
!macroend

!macro customUnInstall
  nsExec::Exec 'netsh advfirewall firewall delete rule name="ISistema Comanda"'
!macroend
