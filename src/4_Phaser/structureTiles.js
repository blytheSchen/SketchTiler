const STRUCTURE_TILES = {
    "tiny_town": {
        forest: {
            regionType: "box",
            color: 2,
            tileIDs: [
                4, 5, 7, 8, 9, 10, 11, 12,
                16, 17, 18, 19, 20, 21, 22, 23, 24, 
                28, 29, 30, 31, 32, 33, 34, 35, 36,
                107, 95
            ],
            priority: 1
        },
        fence: {
            regionType: "box",
            color: 3,
            tileIDs: [
                45, 46, 47, 48, 
                57, 59, 60, 
                69, 70, 71, 72, 
                81, 82, 83
            ],
            priority: 3
        },
        house: {
            regionType: "box",
            color: 1,
            tileIDs: [
                49, 50, 51, 52, 53, 54, 55, 56,
                61, 62, 63, 64, 65, 66, 67, 68,
                73, 74, 75, 76, 77, 78, 79, 80,
                85, 86, 87, 88, 89, 90, 91, 92
            ],
            priority: 3
        },
        /*
        path: {
            regionType: "trace",
            color: 4,
            tileIDs: [
                26, 40, 41, 42, 43, 44
            ],
        }
        */
    },
   "color_blocks": {
        fence: {
            regionType: "box",
            color: 3,
            corners: {
                topleft: [8],
                topright: [13],
                bottomright: [18],
                bottomleft: [23],
            },
            borders: {
                top: [28],
                right: [33],
                bottom: [38],
                left: [43]
            },
            tileIDs: [
                3, 8, 13, 18, 23, 28, 33, 38, 43
            ]
        },
        forest: {
            regionType: "box",
            color: 2,
            corners: {
                topleft: [7],
                topright: [12],
                bottomright: [17],
                bottomleft: [22],
            },
            borders: {
                top: [27],
                right: [32],
                bottom: [37],
                left: [42]
            },
            tileIDs: [
                2, 7, 12, 17, 22, 27, 32, 37, 42
            ],
        },
        house: {
            regionType: "box",
            color: 1,
            corners: {
                topleft: [6],
                topright: [11],
                bottomright: [16],
                bottomleft: [21],
            },
            borders: {
                top: [26],
                right: [31],
                bottom: [36],
                left: [41]
            },
            tileIDs: [
                1, 6, 11, 16, 21, 26, 31, 36, 41
            ],
        }, 
        /*
        path: {
            regionType: "trace",
            color: 4,
            corners: {
                topleft: [9],
                topright: [14],
                bottomright: [19],
                bottomleft: [24],
            },
            borders: {
                top: [29],
                right: [34],
                bottom: [39],
                left: [44]
            },
            tileIDs: [
                4, 9, 14, 19, 24, 29, 34, 39, 44
            ],
        }
        */
    }

}

export default STRUCTURE_TILES;