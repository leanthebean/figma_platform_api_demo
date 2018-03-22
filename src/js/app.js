App = {
  web3Provider: null,
  contracts: {},
  currentColor: null,

  init: function() {
    return App.initWeb3()
  },

  initWeb3: function() {
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider
      web3 = new Web3(web3.currentProvider)
    } else {
      App.web3Provider = new Web3.providers.HttpProvider('http://127.0.0.1:8545')
      web3 = new Web3(App.web3Provider)
    }

    return App.initContract()
  },

  initContract: function() {
    $.getJSON('Gallery.json', function(data) {
      var galleryArtficact = data
      App.contracts.GalleryContract = TruffleContract(galleryArtficact)
      App.contracts.GalleryContract.setProvider(App.web3Provider)
    })

    return App.bindEvents()
  },

  bindEvents: function() {
    $(document).on('keypress', '#figma-url', App.getImagesFromFigmaUrl)
    $(document).on('click', '.ethmoji-div', App.emojiClicked)
  },

  getImagesFromFigmaUrl: function(e) {
    if (e.keyCode == 13) {
      document.querySelector('#loading-gif').setAttribute('style', 'visibility: visible')
      let figmaId = document.querySelector('#figma-url').value.split('/file/')[1].split('/')[0]
      $.getJSON("/get_images", {
        figmaId: figmaId
      }, function(data) {
        for (key in data) {
          App.addEmoji(key, data[key])
        }
        document.querySelector('#loading-gif').setAttribute('style', 'visibility: hidden;')
      })
    }
  },

  emojiClicked: function() {

    let imageUrl = $(this).context.childNodes[0].src
    let name = $(this).context.childNodes[1].innerText

    web3.eth.getAccounts(function(error, accounts) {
      var account = accounts[0];
      App.contracts.GalleryContract.deployed().then(function(instance) {
        galleryInstance = instance;
        $.getJSON("/upload_to_ipfs", {
          name: name,
          imageUrl: imageUrl
        }, function(data) {
          galleryInstance.mint(data.ipfsHash, {
            from: account,
            value: new web3.BigNumber(web3.toWei(.001, "ether"))
          })
        })
      }).then(function(result) {}).catch(function(err) {
        console.log(err.message)
      })
    })
  },

  addEmoji: function(name, imageUrl) {
    let container = document.createElement('div')
    let imgElement = document.createElement('img')
    let pElement = document.createElement('p')

    container.setAttribute('style', 'display:inline-block')
    container.setAttribute('class', 'ethmoji-div')

    imgElement.setAttribute('src', imageUrl)
    pElement.innerText = name

    container.appendChild(imgElement)
    container.appendChild(pElement)

    document.querySelector('#gallery').appendChild(container)
  }
}

$(function() {
  $(window).load(function() {
    App.init()
  })
})