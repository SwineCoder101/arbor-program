/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/arbor_program.json`.
 */
export type ArborProgram = {
  "address": "4BS3mc2pR7WGrS1QDTraDzvtuEriHor114Epc2LJSFcC",
  "metadata": {
    "name": "arborProgram",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "claimYield",
      "discriminator": [
        49,
        74,
        111,
        7,
        186,
        22,
        61,
        165
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "ownerAta",
          "writable": true
        },
        {
          "name": "usdcMint",
          "relations": [
            "globalConfig"
          ]
        },
        {
          "name": "order",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "order.owner",
                "account": "order"
              },
              {
                "kind": "account",
                "path": "order.seed",
                "account": "order"
              }
            ]
          }
        },
        {
          "name": "globalConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "programAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  116,
                  104
                ]
              }
            ]
          }
        },
        {
          "name": "jupiterVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  45,
                  106,
                  117,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "order"
              }
            ]
          }
        },
        {
          "name": "driftVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  45,
                  100,
                  114,
                  105,
                  102,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "order"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "driftYield",
          "type": "u64"
        },
        {
          "name": "jupiterYield",
          "type": "u64"
        }
      ]
    },
    {
      "name": "closeOrder",
      "discriminator": [
        90,
        103,
        209,
        28,
        7,
        63,
        168,
        4
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "ownerAta",
          "writable": true
        },
        {
          "name": "usdcMint",
          "relations": [
            "globalConfig"
          ]
        },
        {
          "name": "order",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "order.owner",
                "account": "order"
              },
              {
                "kind": "account",
                "path": "order.seed",
                "account": "order"
              }
            ]
          }
        },
        {
          "name": "globalConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "programAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  116,
                  104
                ]
              }
            ]
          }
        },
        {
          "name": "jupiterVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  45,
                  106,
                  117,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "order"
              }
            ]
          }
        },
        {
          "name": "driftVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  45,
                  100,
                  114,
                  105,
                  102,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "order"
              }
            ]
          }
        },
        {
          "name": "treasuryVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "programAuthority"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "createOrder",
      "discriminator": [
        141,
        54,
        37,
        207,
        237,
        210,
        250,
        215
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "ownerAta",
          "writable": true
        },
        {
          "name": "usdcMint",
          "relations": [
            "globalConfig"
          ]
        },
        {
          "name": "order",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "seed"
              }
            ]
          }
        },
        {
          "name": "globalConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "programAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  116,
                  104
                ]
              }
            ]
          }
        },
        {
          "name": "jupiterVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  45,
                  106,
                  117,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "order"
              }
            ]
          }
        },
        {
          "name": "driftVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  45,
                  100,
                  114,
                  105,
                  102,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "order"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "seed",
          "type": "u64"
        },
        {
          "name": "jupPerpAmount",
          "type": "u64"
        },
        {
          "name": "driftPerpAmount",
          "type": "u64"
        },
        {
          "name": "ratioBps",
          "type": "u64"
        },
        {
          "name": "driftPerpIdx",
          "type": "u64"
        },
        {
          "name": "jupPerpIdx",
          "type": "u64"
        },
        {
          "name": "driftSide",
          "type": "u8"
        },
        {
          "name": "jupSide",
          "type": "u8"
        }
      ]
    },
    {
      "name": "createProtocolVaults",
      "discriminator": [
        4,
        26,
        42,
        96,
        37,
        100,
        44,
        179
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "programAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  116,
                  104
                ]
              }
            ]
          }
        },
        {
          "name": "globalConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "jupiterVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  45,
                  106,
                  117,
                  112
                ]
              },
              {
                "kind": "arg",
                "path": "order"
              }
            ]
          }
        },
        {
          "name": "driftVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  45,
                  100,
                  114,
                  105,
                  102,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "order"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "order",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "initializeConfig",
      "discriminator": [
        208,
        127,
        21,
        1,
        194,
        190,
        196,
        70
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "globalConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "programAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  116,
                  104
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "feeBps",
          "type": "u64"
        },
        {
          "name": "admin",
          "type": "pubkey"
        },
        {
          "name": "usdcMint",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "keeperWithdraw",
      "discriminator": [
        191,
        82,
        130,
        117,
        193,
        212,
        189,
        201
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "globalConfig"
          ]
        },
        {
          "name": "usdcMint",
          "relations": [
            "globalConfig"
          ]
        },
        {
          "name": "globalConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "programAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  116,
                  104
                ]
              }
            ]
          }
        },
        {
          "name": "jupiterVault",
          "writable": true
        },
        {
          "name": "driftVault",
          "writable": true
        },
        {
          "name": "treasuryVault",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "driftAmount",
          "type": "u64"
        },
        {
          "name": "jupiterAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "topUpOrder",
      "discriminator": [
        254,
        247,
        220,
        66,
        36,
        88,
        94,
        6
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "order"
          ]
        },
        {
          "name": "ownerAta",
          "writable": true
        },
        {
          "name": "usdcMint",
          "relations": [
            "globalConfig"
          ]
        },
        {
          "name": "order",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "order.owner",
                "account": "order"
              },
              {
                "kind": "account",
                "path": "order.seed",
                "account": "order"
              }
            ]
          }
        },
        {
          "name": "globalConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "programAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  116,
                  104
                ]
              }
            ]
          }
        },
        {
          "name": "jupiterVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  45,
                  106,
                  117,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "order"
              }
            ]
          }
        },
        {
          "name": "driftVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  45,
                  100,
                  114,
                  105,
                  102,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "order"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "driftAmount",
          "type": "u64"
        },
        {
          "name": "jupiterAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdrawFromTreasury",
      "discriminator": [
        0,
        164,
        86,
        76,
        56,
        72,
        12,
        170
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "globalConfig"
          ]
        },
        {
          "name": "globalConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "programAuthority",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  116,
                  104
                ]
              }
            ]
          }
        },
        {
          "name": "adminAta",
          "writable": true
        },
        {
          "name": "treasuryVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "programAuthority"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "usdcMint",
          "relations": [
            "globalConfig"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "globalConfig",
      "discriminator": [
        149,
        8,
        156,
        202,
        160,
        252,
        176,
        217
      ]
    },
    {
      "name": "order",
      "discriminator": [
        134,
        173,
        223,
        185,
        77,
        86,
        28,
        51
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "healthTooLow",
      "msg": "Health factor too low"
    },
    {
      "code": 6001,
      "name": "unAuthorizedCloseOrder",
      "msg": "Signer is not the owner of the order, cannot close order"
    },
    {
      "code": 6002,
      "name": "unAuthorizedClaimYield",
      "msg": "Signer is not the owner of the order, cannot claim yield"
    },
    {
      "code": 6003,
      "name": "unAuthorizedTopUpOrder",
      "msg": "Signer is not the owner of the order, cannot top up order"
    },
    {
      "code": 6004,
      "name": "invalidSide",
      "msg": "client error: Invalid side, please check the side of the order"
    },
    {
      "code": 6005,
      "name": "unAuthorizedKeeperWithdraw",
      "msg": "Unauthorized keeper withdraw"
    },
    {
      "code": 6006,
      "name": "unAuthorizedWithdrawFromTreasury",
      "msg": "Unauthorized withdraw from treasury"
    }
  ],
  "types": [
    {
      "name": "globalConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "feeBps",
            "type": "u64"
          },
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "usdcMint",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "authBump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "order",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "seed",
            "type": "u64"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "isOpen",
            "type": "bool"
          },
          {
            "name": "ratioBps",
            "type": "u64"
          },
          {
            "name": "driftPerpIdx",
            "type": "u64"
          },
          {
            "name": "jupPerpIdx",
            "type": "u64"
          },
          {
            "name": "driftPerpAmount",
            "type": "u64"
          },
          {
            "name": "jupPerpAmount",
            "type": "u64"
          },
          {
            "name": "driftSide",
            "type": "u8"
          },
          {
            "name": "jupSide",
            "type": "u8"
          },
          {
            "name": "driftVaultBump",
            "type": "u8"
          },
          {
            "name": "jupVaultBump",
            "type": "u8"
          },
          {
            "name": "lastPricePv",
            "type": "u64"
          },
          {
            "name": "lastArbitrageRate",
            "type": "u64"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "seed",
      "type": "string",
      "value": "\"anchor\""
    }
  ]
};
