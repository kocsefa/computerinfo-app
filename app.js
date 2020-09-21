//Server Address
const SERVER = 'http://172.26.1.48:9292'

const $ = require('jquery')
const alertify = require('alertifyjs')
const socketIOClient = require('socket.io-client')
const socket = socketIOClient(SERVER)
const child = require('child_process').execFile
//SCCM viewer tool location
const executablePath = 'C:\\Program Files (x86)\\Microsoft Configuration Manager\\AdminConsole\\bin\\i386\\CmRcViewer.exe'
require('datatables.net')()
const remote = require('electron').remote;
const package = require('./package.json')
const parameters = require('./parameters.json')

$('head title').text('Center v' + package.version)
//Temayı parametreye göre ayarlama yapılıyor
if (parameters.darktheme && parameters.darktheme === 1) {
  $('html').addClass('dark')
}
//Search için otomatize işlemleri
//Tüm alfanumerik karakterleri search kutucuğuna yönlendirmek için focus özelliği ile seçim yaptırılıyor
$(function () {
  $(document).keydown(function (e) {
    if (!e.ctrlKey && e.keyCode >= 48 && e.keyCode <= 111) {
      $('input').focus()
    }
    //ESC tuşu aramayı temizliyor 
    if (e.keyCode === 27) {
      if (!executed) {
        setTimeout(timer, 300)
        executed = true
      }
      escCtrl++
      $('input').focus()
      $('input').text('')
    }
  })
})

//Pencere min-max-close işlemleri
var escCtrl = 0
var executed = false
function timer() {
  executed = false
  if (escCtrl > 1) {
    mini()
    escCtrl = 0
  } else {
    escCtrl = 0
  }
}
function maxi() {
  var window = remote.getCurrentWindow()
  window.maximize()
}
function mini() {
  var window = remote.getCurrentWindow()
  window.minimize()
}
if (parameters.fullScreen === 1) {
  maxi()
}

document.getElementById("min-btn").addEventListener("click", function (e) {
  var window = remote.getCurrentWindow()
  window.minimize()
})

document.getElementById("max-btn").addEventListener("click", function (e) {
  var window = remote.getCurrentWindow()
  if (!window.isMaximized()) {
    window.maximize()
  } else {
    window.unmaximize()
  }
})

document.getElementById("close-btn").addEventListener("click", function (e) {
  var window = remote.getCurrentWindow()
  window.close()
})

//DataTable Sütün ayarlama ve parametre işlemleri
const dataTable = $('#userdata').DataTable({
  createdRow: (row, data, dataIndex) => {
    $(row).attr('id', data[0])
  },
  aLengthMenu: [
    [10, 50, -1],
    [10, 50, "All"]
  ],
  order: [6, 'desc'],
  iDisplayLength: parameters.iDisplayLength || 10
})

notification = (data) => {
  if (parameters.notification === 1) {
    let notify = new Notification('Center', {
      body: 'Yeni Oturum Açma İşlemi\n' +
        data.UserName + ' adlı kullanıcı ' + data.ComputerName + ' terminalinde oturum açtı!'
    })

    notify.onclick = () => {
      console.log('Notification clicked')
    }
  }
}

//Socket İşlemleri
socket.on('insert', ({ data }) => {
  const newRow = [
    data.ComputerName,
    data.UserName,
    data.TCPInfo.map(info => info.IPv4).join(', '),
    `<a href="#" style="margin-right: 16px" class="connect-device btn" data-computer-name="${data.ComputerName}" data-user-name="${data.UserName}">SystemCenter</a>`,
    data.Model,
    data.OS + ' [' + data.OSVersion + ']',
    data.ConnectionTime
  ]
  dataTable.rows.add([newRow])
  dataTable.draw()
  notification(data)
})

socket.on('update', ({ data }) => {
  dataTable.rows().every(function () {
    if (this.data()[0] === data.ComputerName) {
      this.data([
        data.ComputerName,
        data.UserName,
        data.TCPInfo.map(info => info.IPv4).join(', '),
        `<a href="#" style="margin-right: 16px" class="connect-device btn" data-computer-name="${data.ComputerName}" data-user-name="${data.UserName}">SystemCenter</a>`,
        data.Model,
        data.OS + ' [' + data.OSVersion + ']',
        data.ConnectionTime
      ])
    }
  })
  dataTable.draw()

  notification(data)
})

socket.on('init', ({ data }) => {
  dataTable.clear()
  const mappedData = data.map(row => [
    row.ComputerName,
    row.UserName,
    row.TCPInfo.map(info => info.IPv4).join(', '),
    `<a href="#" style="margin-right: 16px" class="connect-device btn" data-computer-name="${row.ComputerName}" data-user-name="${row.UserName}">SystemCenter</a>`,
    row.Model,
    row.OS + ' [' + row.OSVersion + ']',
    row.ConnectionTime
  ])
  dataTable.rows.add(mappedData)
  dataTable.draw()
})

socket.on('active-clients', ({ clients }) => {
  $('#active-user-label').text(clients + ' Active User')
})

//Bağlantı için onay popup oluşturma
$('body').on('click', '.connect-device', function (event) {
  event.preventDefault()
  event.stopPropagation()

  var computer = $(this).data('computer-name')
  var user = $(this).data('user-name')
  alertify.confirm(
    computer + ' bağlanılıyor',
    user + ' Kullanıcıya bağlanmaya devam etmek istiyor musunuz?',
    function () {
      child(executablePath, [computer], (err, data) => {
        if (err) {
          console.error(err)
          return
        }
      })
    },
    function () { alertify.error('Connection canceled') })
}
)
