var express = require('express')
var serveStatic = require('serve-static')
var path = require('path')
var fetch = require('isomorphic-fetch')
var fs = require('fs')
var IPFS = require('ipfs')
var ipfsNode = new IPFS()

var app = express()

app.use(serveStatic(path.join(__dirname, 'src')))
app.use(serveStatic(path.join(__dirname, 'build/contracts')))

// Example file: https://www.figma.com/file/RuXvVnnTvSIkccoz1ANOvEJE/Emojis

const figmaApiKey = "<your Figma API token here"

app.use('/get_images', async function(req, res, next) {
  let result = await getImagesFromFigma(req.query.figmaId)
  res.send(JSON.stringify(result))
})

async function getImagesFromFigma(figmaId) {
  let result = await fetch('https://api.figma.com/v1/files/' + figmaId, {
    method: 'GET',
    headers: {
      'X-Figma-Token': figmaApiKey
    }
  })

  let figmaTreeStructure = await result.json()

  //let's only keep nodes we want
  //we'll only keep nodes in the 'emojis' page of our Figma file and only nodes that are frames and of size 500x500

  let ethmojis = figmaTreeStructure.document.children
    .filter(child => child.name.toLowerCase() == 'emojis')[0].children
    .filter(child => child.type == 'FRAME' && child.absoluteBoundingBox.width == 500 && child.absoluteBoundingBox.height == 500)
    .map(frame => {
      return {
        name: frame.name,
        id: frame.id
      }
    })

  //we'll call the /images API endpoint with batched ids 

  let ids = ethmojis.map(ethmoji => ethmoji.id).join(',')

  let imageResult = await fetch('https://api.figma.com/v1/images/' + figmaId + '?scale=2&ids=' + ids, {
    method: 'GET',
    headers: {
      'X-Figma-Token': figmaApiKey
    }
  })

  let figmaImages = await imageResult.json()

  figmaImages = figmaImages.images

  //lets format these images as a hash of name : imageUrl

  return ethmojis.reduce(function(map, ethmoji) {
    map[ethmoji.name] = figmaImages[ethmoji.id]
    return map
  }, {})
}

app.use('/upload_to_ipfs', async function(req, res, next) {
  //let's first download the image into a temporary folder 
  fetch(req.query.imageUrl)
    .then(image => {
      let filename = './tmp/' + req.query.name + '.png'
      const fileStream = fs.createWriteStream(filename)
      image.body.pipe(fileStream)

      fileStream.on('finish', function() {
        let uploadImage = {
          path: req.query.name,
          content: fs.createReadStream(filename)
        }

        ipfsNode.files.add(uploadImage, function(err, ipfsFile) {
          if (!err) {
            res.send({
              'ipfsHash': ipfsFile[0].hash
            })

          } else {
            console.log(err)
          }
        })
      })
    })
})

app.listen(3000)