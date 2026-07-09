{
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

  outputs = {nixpkgs, ...}: let
    forSystems = systems: function:
      nixpkgs.lib.genAttrs systems (
        system: function system nixpkgs.legacyPackages.${system}
      );
  in {
    devShells = forSystems nixpkgs.lib.systems.flakeExposed (_system: pkgs: {
      default = pkgs.mkShell {
        packages = [pkgs.nodejs_26];
      };
    });

    packages = forSystems ["x86_64-linux" "aarch64-linux"] (_system: pkgs: {
      dockerImage = pkgs.dockerTools.buildLayeredImage {
        name = "tinypaas-demo-app";
        tag = "latest";

        config = {
          Cmd = ["${pkgs.nodejs_26}/bin/node" "${./index.js}"];
          ExposedPorts = {
            "3000/tcp" = {};
          };
        };
      };
    });
  };
}
