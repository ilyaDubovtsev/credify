FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["src/Credify.Core/Credify.Core.csproj", "src/Credify.Core/"]
COPY ["src/Credify.Api/Credify.Api.csproj", "src/Credify.Api/"]
RUN dotnet restore "src/Credify.Api/Credify.Api.csproj"
COPY src/ src/
RUN dotnet publish "src/Credify.Api/Credify.Api.csproj" -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "Credify.Api.dll"]

