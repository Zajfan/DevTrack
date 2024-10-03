// ChatHub.cs
public class ChatHub : Hub
{
    public object? Clients { get; private set; }

    public async Task SendMessage(string user, string message)
    {
        object value = await Clients.All.SendAsync("ReceiveMessage", user, message);
    }
}

public class Hub
{
}