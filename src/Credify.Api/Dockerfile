FROM mcr.microsoft.com/dotnet/sdk:8.0@sha256:3c0edbfe1549dd93fb789dc96299a40df865ad7bffefcaf38e8c05940686d641 AS build
WORKDIR /src
COPY ["src/Credify.Core/Credify.Core.csproj", "src/Credify.Core/"]
COPY ["src/Credify.Api/Credify.Api.csproj", "src/Credify.Api/"]
RUN dotnet restore "src/Credify.Api/Credify.Api.csproj"
COPY src/ src/
RUN dotnet publish "src/Credify.Api/Credify.Api.csproj" -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0@sha256:8f6a307ae32fb393a4b4bcde0a81f0ce3f0a715de0e5575df71f3030448f2dde AS final
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "Credify.Api.dll"]
